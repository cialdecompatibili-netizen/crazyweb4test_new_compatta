# frozen_string_literal: true

# DATE IN ITALIANO. Filtro Liquid `data_it`: come `date` ma con mesi e giorni in italiano.
#   {{ page.date | data_it: '%d %B %Y' }}  -> 03 ottobre 2026   (%B = mese intero, minuscolo)
#   {{ page.date | data_it: '%d %b %Y' }}  -> 03 Ott 2026       (%b = mese breve, iniziale maiuscola: per tabelle ed elenchi)
#   %A giorno intero (minuscolo), %a giorno breve (Lun, Mar...). Tutti gli altri codici come strftime.
# Si attiva solo se `lang:` in _config.yml (Impostazioni admin > Lingua) inizia per "it": con un'altra lingua
# il filtro si comporta come `date` normale, quindi un clone in inglese non si rompe.
# Accetta anche 'now'. Se il valore non e' una data valida lo restituisce com'era (nessun errore di build).
# Usato in: _layouts/archive.liquid, _layouts/post.liquid, _includes/latest_posts.liquid, _includes/news.liquid,
# _includes/footer.liquid, _pages/blog.md. Per una data nuova in un layout usare SEMPRE data_it, non date con %b/%B:
# altrimenti il mese esce in inglese (vedi CLAUDE.md > Punti critici).
require 'time'

module Jekyll
  module DataItaliana
    MESI = %w[gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre].freeze
    MESI_BREVI = %w[Gen Feb Mar Apr Mag Giu Lug Ago Set Ott Nov Dic].freeze
    GIORNI = %w[domenica lunedì martedì mercoledì giovedì venerdì sabato].freeze
    GIORNI_BREVI = %w[Dom Lun Mar Mer Gio Ven Sab].freeze

    def data_it(input, formato = '%d %B %Y')
      t = to_time_it(input)
      return input if t.nil?

      lang = @context.registers[:site].config['lang'].to_s.downcase
      return t.strftime(formato.to_s) unless lang.start_with?('it')

      f = formato.to_s.gsub(/%[BbAa]/) do |m|
        case m
        when '%B' then MESI[t.month - 1]
        when '%b' then MESI_BREVI[t.month - 1]
        when '%A' then GIORNI[t.wday]
        else GIORNI_BREVI[t.wday]
        end
      end
      # i nomi sono gia' sostituiti: eventuali % rimasti sono codici strftime normali (%d, %Y, ...)
      t.strftime(f)
    end

    private

    def to_time_it(input)
      return nil if input.nil?
      return Time.now if %w[now today].include?(input.to_s.strip.downcase)
      return input.to_time if input.respond_to?(:to_time) && !input.is_a?(String)

      Time.parse(input.to_s)
    rescue ArgumentError
      nil
    end
  end
end

Liquid::Template.register_filter(Jekyll::DataItaliana)
