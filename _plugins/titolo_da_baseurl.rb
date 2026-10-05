# frozen_string_literal: true

# TITOLO SITO AUTOMATICO dal baseurl.
#  - _config.yml `title:` vuoto o `blank` => il titolo si ricava dal baseurl
#    (/crazyweb4test -> "Crazyweb4test"; - e _ diventano spazi; prima lettera maiuscola).
#    Baseurl vuoto (sito in root): si usa il primo pezzo dell'host di `url`.
#  - `title:` valorizzato (da Impostazioni admin o a mano) => vince sempre, non si tocca.
# Il valore finisce in site.title, quindi header, <title>, footer, about e meta author lo usano senza altro codice.
# PUNTO CRITICO (CLAUDE.md punto 18): la stessa regola e' COPIATA A MANO in autoTitle() di admin/admin-media.js (serve solo al
# segnaposto del campo Titolo). Se cambi qui, cambia anche li, altrimenti l'anteprima dell'admin mente. Solo TEST.
# Se non si riesce a ricavare nulla resta `blank` e i template ripiegano su first_name/middle_name/last_name.
require 'uri'

Jekyll::Hooks.register :site, :after_init do |site|
  t = site.config['title'].to_s.strip
  next unless t.empty? || t.casecmp('blank').zero?

  src = site.config['baseurl'].to_s.gsub(%r{\A/+|/+\z}, '').split('/').last.to_s
  if src.empty?
    host = begin
      URI.parse(site.config['url'].to_s).host.to_s
    rescue URI::InvalidURIError
      ''
    end
    src = host.split('.').first.to_s
  end
  name = src.tr('-_', '  ').strip
  next if name.empty?

  site.config['title'] = name[0].upcase + name[1..].to_s
end
