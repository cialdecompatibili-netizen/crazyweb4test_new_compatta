# frozen_string_literal: true

# PERFORMANCE: toglie dalle pagine gia' generate le librerie che quella pagina NON usa.
#
# Perche': il tema (al-folio, gem) carica su OGNI pagina MathJax (~1 MB di JS), Altmetric, Dimensions, Masonry, Academicons,
# scholar-icons e due font Google inutilizzati (Roboto Slab, Material Icons). Una pagina d'agenzia non li usa, ma costano
# richieste, byte e tempo di esecuzione (LCP/INP). Qui si decide PAGINA PER PAGINA, guardando l'HTML finale.
#
# SICUREZZA (leggere prima di modificare):
# - Si rimuove una libreria SOLO se nella pagina non c'e' nessun segno che la usi. Nel dubbio la libreria RESTA (falso positivo = niente
#   guadagno, mai una pagina rotta). Per questo i controlli sono larghi e quelli di rimozione stretti.
# - Si lavora su `post_render` (HTML completo con layout): non tocca sorgenti, gem ne' file generati dal tema.
# - Spegnere tutto: `performance: { enabled: false }` in _config.yml. Per forzare una libreria su una pagina: `math: true` nel front matter.
# - I controlli sul testo (matematica) ignorano i blocchi <script>, altrimenti le regex dentro gli script del tema (`\(`) darebbero sempre "c'e' matematica".
# - Solo TEST (non su PROD). Verifica: `python verifica_perf.py --build <_site>` (conta librerie per pagina e controlla che quelle usate ci siano).

module Jekyll
  module Perf
    # segni di matematica: $$..$$, \( \), \[ \], \begin{, $x$ (MathJax e' configurato con $...$ in linea), <script type="math/tex"> di kramdown
    MATH_TEXT = /\$\$|\\\(|\\\[|\\begin\{|\$[^\s$][^$\n]{0,200}\$/.freeze
    MATH_TAG = %r{math/tex|class="[^"]*\bmathjax\b}.freeze
    SCRIPT_BLOCK = %r{<script\b.*?</script>}m.freeze

    # un tag <script ...></script> con src che contiene uno dei nomi (gli attributi possono andare su piu' righe)
    def self.script_rx(*names)
      %r{<script\b[^>]*?(?:#{names.map { |n| Regexp.escape(n) }.join('|')})[^>]*>\s*</script>[ \t]*\r?\n?}m
    end

    FONT_LINK = %r{<link\b[^>]*?href="(https://fonts\.googleapis\.com/css[^"]*)"[^>]*>}m.freeze

    def self.run(item)
      cfg = item.site.config['performance']
      return if cfg.is_a?(Hash) && cfg['enabled'] == false
      return unless item.respond_to?(:output_ext) && item.output_ext == '.html'

      out = item.output
      cut = out.is_a?(String) ? out.index('</head>') : nil
      return unless cut

      body = out[cut..-1]
      text = body.gsub(SCRIPT_BLOCK, '') # testo senza script, per cercare la matematica

      # Icone: si tolgono i CSS di Academicons e scholar-icons se la pagina non ne usa le classi (FontAwesome resta: serve a tutte le pagine).
      out = out.sub(/(<head.*?<\/head>)/m) { |h| h.gsub(%r{<link\b[^>]*?(?:academicons|scholar-icons)[^>]*>[ \t]*\r?\n?}m, '') } unless body =~ /class="(?:[^"]*\s)?ai-[a-z0-9]|class="(?:[^"]*\s)?scholar-icon/

      # MathJax (+ sua configurazione): solo se c'e' matematica o se la pagina lo chiede con `math: true`.
      unless item.data['math'] || text =~ MATH_TEXT || body =~ MATH_TAG
        out = out.gsub(script_rx('tex-mml-chtml', 'mathjax-setup'), '')
      end

      # Badge delle pubblicazioni: Altmetric e Dimensions solo se nella pagina c'e' un badge.
      unless body =~ /altmetric-embed|__dimensions_badge_embed__/
        out = out.gsub(script_rx('altmetric.com', 'cloudfront.net/assets/embed.js', 'badge.dimensions.ai'), '')
      end

      # Masonry: masonry.js cerca ESATTAMENTE `.grid` (document.querySelector('.grid')): senza quella classe non fa niente.
      unless body =~ /class="[^"]*\bgrid\b[^"]*"/
        out = out.gsub(script_rx('masonry-layout', 'imagesloaded', 'assets/js/masonry.js'), '')
      end

      # Google Fonts: CSS non bloccante (display=swap: il testo si vede subito col font di ripiego) + preconnect agli host dei font e di jsdelivr.
      # `defer` sul <link> non esiste in HTML: il CSS bloccava comunque il disegno della pagina.
      out = out.sub(FONT_LINK) do
        href = Regexp.last_match(1)
        # Roboto in LOCALE (assets/fonts, generato da _tools/self_host_roboto.py): niente host di Google, il font arriva col CSS
        # e il testo non cambia carattere dopo il primo disegno (niente salto di layout / CLS). Se i file mancano, resta Google Fonts.
        if href.include?('family=Roboto') && File.exist?(File.join(item.site.source, 'assets/fonts/roboto.css'))
          bu = item.site.config['baseurl']
          next %(<link rel="preload" href="#{bu}/assets/fonts/roboto-latin.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="#{bu}/assets/fonts/roboto.css">)
        end
        %(<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n) +
          %(<link rel="stylesheet" href="#{href}" media="print" onload="this.media='all'">\n<noscript><link rel="stylesheet" href="#{href}"></noscript>)
      end
      out = out.sub(/(<head(?:\s[^>]*)?>)/) { "#{Regexp.last_match(1)}\n<link rel=\"preconnect\" href=\"https://cdn.jsdelivr.net\" crossorigin>" } if out.include?('cdn.jsdelivr.net')

      # Font Awesome in LOCALE (assets/fontawesome): nessuna connessione a jsdelivr nel percorso critico del rendering.
      # Se la cartella non esiste resta il CDN del tema (nessun rischio di pagina senza icone).
      if File.exist?(File.join(item.site.source, 'assets/fontawesome/css/all.min.css'))
        fa = "#{item.site.config['baseurl']}/assets/fontawesome/css/all.min.css"
        fa_font = "#{item.site.config['baseurl']}/assets/fontawesome/webfonts/fa-solid-900.woff2"
        # preload del font delle icone: parte subito, senza aspettare che il CSS lo scopra (accorcia la catena CSS -> font)
        out = out.sub(%r{<link\b[^>]*?fontawesome-free[^>]*>}m) do
          %(<link rel="preload" href="#{fa_font}" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="#{fa}">)
        end
      end

      # Script jsdelivr del tema (back-to-top, medium-zoom, masonry, imagesloaded) -> copie locali in assets/cdn-locale/.
      # Se il file locale non esiste il tag resta com'e' (nessun rischio di pagina rotta). Senza integrity/crossorigin: ora e' stessa origine.
      out = out.gsub(%r{<script\b([^>]*?)\ssrc="https://cdn\.jsdelivr\.net/npm/[^"]*/([^"/]+\.js)"([^>]*)>}m) do
        md = Regexp.last_match
        if File.exist?(File.join(item.site.source, 'assets/cdn-locale', md[2]))
          rest = (md[1] + md[3]).gsub(/\sintegrity="[^"]*"/, '').gsub(/\scrossorigin(?:="[^"]*")?/, '')
          %(<script#{rest} src="#{item.site.config['baseurl']}/assets/cdn-locale/#{md[2]}">)
        else
          md[0]
        end
      end
      # se non resta piu' nessuna risorsa da jsdelivr, il preconnect non serve
      out = out.sub(%r{\n?<link rel="preconnect" href="https://cdn\.jsdelivr\.net" crossorigin>}, '') unless out.scan('cdn.jsdelivr.net').size > 1

      item.output = out
    end
  end
end

Jekyll::Hooks.register %i[pages documents], :post_render do |item|
  Jekyll::Perf.run(item)
end
