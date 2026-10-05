# frozen_string_literal: true

# URL dei post presi dalla CATEGORIA (la data NON e' nell'URL).
#  - permalink_da_categoria (_config.yml): modello di default, es. /blog/:categoria/:title/
#  - permalink_per_categoria (_config.yml): eccezioni per categoria, es. { prodotti: /negozio/:title/ }. Oggi VUOTO:
#    i servizi NON passano di qui, sono la collection 'servizi' (permalink in _config.yml > collections, /servizi/:title/).
#    Questo plugin lavora SOLO sui post (site.posts): non tocca mai _servizi/.
#    La regola vince sul modello di default. Chiave = categoria slugificata come negli archivi.
# Segnaposto: :categoria = prima categoria del post (slugificata), :title = nome file senza data.
# Post senza categoria: permalink globale di _config.yml (/blog/:title/).
# Un "permalink:" scritto nel post vince sempre. La data resta in front matter (ordine per data,
# link anno/categoria invariati).
# Per i post che cambiano URL per effetto di una regola in permalink_per_categoria vengono generate
# pagine-redirect sui vecchi indirizzi (/blog/<categoria>/<articolo>/ e /blog/<anno>/<articolo>/),
# con canonical: i link gia' indicizzati o salvati continuano a funzionare.
# PUNTI CRITICI (dettaglio in CLAUDE.md > Punti critici):
#  - la regola dei servizi esiste anche in repos.json (card) e in admin/admin-views.js (etichetta commit): tenerle uguali;
#  - un 'permalink:' nel front matter del post vince sempre e lo esclude da regola e redirect;
#  - i redirect sono pagine HTML (non 301) e si generano solo per le categorie con regola in permalink_per_categoria;
#  - solo TEST: questo plugin NON e' su PROD (crazyweb4); clona_test.ps1 lo sovrascriverebbe con la versione PROD.
Jekyll::Hooks.register :site, :post_read do |site|
  modello = site.config["permalink_da_categoria"]
  regole = site.config["permalink_per_categoria"]
  regole = {} unless regole.is_a?(Hash)
  site.config["_redirect_vecchi"] = []
  modello_ok = modello.is_a?(String) && modello.include?(":categoria")
  next unless modello_ok || !regole.empty?

  site.posts.docs.each do |doc|
    # Un permalink scritto a mano nel post ha la precedenza: lo lasciamo stare (e quindi niente redirect per lui).
    next if doc.data["permalink"]

    cats = Jekyll::Utils.pluralized_array_from_hash(doc.data, "category", "categories").map(&:to_s)
    cat = cats.first
    next if cat.nil? || cat.strip.empty?

    cat_slug = Jekyll::Utils.slugify(cat)
    regola = regole[cat_slug]
    if regola.is_a?(String)
      nuovo_modello = regola
      slug = doc.data["slug"].to_s.strip; slug = File.basename(doc.path, ".*").sub(/\A\d{4}-\d{2}-\d{2}-/, "") if slug.empty? # slug sempre valorizzato
      vecchi = []
      vecchi << "/blog/#{cat_slug}/#{slug}/" if modello_ok
      vecchi << "/blog/#{doc.date.year}/#{slug}/"
      nuovo = nuovo_modello.sub(":categoria", cat_slug).sub(":title", slug)
      vecchi.uniq.reject { |v| v == nuovo }.each { |v| site.config["_redirect_vecchi"] << [v, nuovo] }
    elsif modello_ok
      nuovo_modello = modello
    else
      next
    end

    doc.data["permalink"] = nuovo_modello.sub(":categoria", cat_slug)
    # Jekyll memorizza l'URL del documento in @url: lo azzeriamo cosi' viene ricalcolato col permalink appena scelto.
    doc.instance_variable_set(:@url, nil)
  end
end

# CONTROLLO COLLISIONI: due post/pagine sullo stesso URL = Jekyll ne pubblica una sola, senza errore.
# Qui la build si FERMA con l'elenco dei file in conflitto (nel config: permalink_collisioni_fatali: false = solo avviso).
Jekyll::Hooks.register :site, :post_read do |site|
  visti = Hash.new { |h, k| h[k] = [] }
  (site.posts.docs + site.pages).each do |p|
    url = p.url.to_s
    next if url.empty?
    visti[url] << (p.respond_to?(:relative_path) ? p.relative_path : p.name.to_s)
  end
  dup = visti.select { |_, v| v.size > 1 }
  next if dup.empty?
  dup.each { |u, v| Jekyll.logger.error("collisione URL", "#{u} <- #{v.join(", ")}") }
  raise Jekyll::Errors::FatalException, "collisione di URL (elenco sopra)" unless site.config["permalink_collisioni_fatali"] == false
end

# REDIRECT DA CAMBIO SLUG (campo "Indirizzo" dell'admin): 'slug_precedenti: [a, b]' nel front matter = vecchi slug.
# Per ognuno si genera una pagina-redirect sul vecchio URL (stesso modello dell'URL attuale, col vecchio slug).
# Vale per post e per ogni collection (progetti, servizi). Un vecchio URL gia' occupato da un'altra pagina viene saltato (niente collisione).
Jekyll::Hooks.register :site, :post_read do |site|
  docs = site.posts.docs.dup
  site.collections.each { |nome, c| docs.concat(c.docs) unless nome == "posts" }
  occupati = docs.map { |d| d.url.to_s } + site.pages.map { |pg| pg.url.to_s }
  site.config["_redirect_vecchi"] ||= []
  docs.each do |doc|
    prec = doc.data["slug_precedenti"]
    prec = prec.to_s.split(/[\s,\[\]]+/) unless prec.is_a?(Array)
    prec = prec.map(&:to_s).reject(&:empty?)
    next if prec.empty?
    attuale = Jekyll::Utils.slugify(doc.data["slug"].to_s)
    nuovo = doc.url.to_s
    next if attuale.empty? || !nuovo.end_with?("/#{attuale}/")
    base = nuovo[0...(nuovo.length - attuale.length - 1)]
    prec.each do |vecchio|
      url_vecchio = "#{base}#{Jekyll::Utils.slugify(vecchio)}/"
      next if url_vecchio == nuovo || occupati.include?(url_vecchio)
      site.config["_redirect_vecchi"] << [url_vecchio, nuovo]
    end
  end
end

module PermalinkDaCategoria
  class PaginaRedirect < Jekyll::PageWithoutAFile
    def initialize(site, vecchio, nuovo)
      super(site, site.source, vecchio.sub(%r{\A/}, ""), "index.html")
      dest = "#{site.config["baseurl"]}#{nuovo}"
      assoluto = "#{site.config["url"]}#{dest}"
      data["layout"] = nil
      data["sitemap"] = false
      data["permalink"] = vecchio
      self.content = <<~HTML
        <!DOCTYPE html>
        <html lang="it"><head><meta charset="utf-8">
        <title>Reindirizzamento</title>
        <link rel="canonical" href="#{assoluto}">
        <meta name="robots" content="noindex">
        <meta http-equiv="refresh" content="0; url=#{dest}">
        <script>location.replace(#{dest.inspect});</script>
        </head><body><a href="#{dest}">Vai alla nuova pagina</a></body></html>
      HTML
    end
  end

  class GeneraRedirect < Jekyll::Generator
    safe true
    priority :low # gira dopo gli altri generatori; le pagine-redirect hanno sitemap=false per non finire nella sitemap

    def generate(site)
      (site.config["_redirect_vecchi"] || []).each do |vecchio, nuovo|
        site.pages << PaginaRedirect.new(site, vecchio, nuovo)
      end
    end
  end
end
