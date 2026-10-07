---
layout: page
title: servizi
nav: false
permalink: /servizi/
---

<style>
/* CARD BIANCHE (stesso stile delle card "Perche' su fune" di Italfuni, ma SENZA icona): fondo bianco FISSO anche in tema scuro, testo scuro fisso, bordo sottile, angoli 22px,
   ombra morbida a due strati, leggero sollevamento all'hover. Stesso identico stile in home (.srv-home-card, .prj-home-card) e in /projects/ (.projects .card): se lo ritocchi, ritoccali tutti e tre. */
.srv-t{width:100%;border-collapse:separate;border-spacing:16px;margin:6px 0 26px}
.srv-t td{width:33.33%;padding:18px 22px;min-height:112px;background:#fff;color:#1f2933;border:1px solid #e6e8ec;border-radius:22px;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.12);font-size:.94rem;line-height:1.5;vertical-align:middle;transition:transform .25s ease,box-shadow .25s ease}
.srv-t td:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(16,24,40,.05),0 16px 32px -14px rgba(16,24,40,.2)}
.srv-t td small{display:block;color:#3a4552}
.srv-t td:empty{background:none;border:0;box-shadow:none}
.srv-t td:empty:hover{transform:none;box-shadow:none}
.srv-t td{position:relative}
.srv-t td a{color:#111827;font-weight:600;text-decoration:none}
.srv-t td a::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:22px}
@media(max-width:600px){.srv-t,.srv-t tbody,.srv-t tr,.srv-t td{display:block;width:100%}.srv-t{border-spacing:0}.srv-t td{margin-bottom:12px;min-height:0}.srv-t td:empty{display:none}}
@media (prefers-reduced-motion:reduce){.srv-t td{transition:none}.srv-t td:hover{transform:none}}
</style>
{% comment -%}
  PAGINA SERVIZI DINAMICA. Non si modifica a mano: l'elenco nasce dai file di _servizi/ (admin > Servizi).
  - Sezioni e loro ordine: _data/servizi_gruppi.yml. Il servizio sceglie la sezione col campo 'gruppo' (nome esatto).
  - Dentro la sezione: campo 'ordine' (numero), poi alfabetico. Riga sotto il titolo: campo 'sottotitolo' (opzionale).
  - Un servizio senza gruppo, o con un gruppo non presente nell'elenco, finisce in "Altri servizi" in fondo: non si perde mai.
  - Servizio nuovo = compare da solo; servizio eliminato o nascosto (published: false) = sparisce da solo.
  Il disegno delle tabelle sta in _includes/servizi_tabella.liquid. Vedi CLAUDE.md > Servizi.
{%- endcomment %}
{%- assign gruppi = site.data.servizi_gruppi %}
{%- assign altri = "" | split: "" %}
{%- for s in site.servizi %}
{%- unless gruppi contains s.gruppo %}{% assign altri = altri | push: s %}{% endunless %}
{%- endfor %}
{%- for g in gruppi %}
{%- assign sezione = site.servizi | where: "gruppo", g %}
{% include servizi_tabella.liquid titolo=g lista=sezione %}
{%- endfor %}
{% include servizi_tabella.liquid titolo="Altri servizi" lista=altri %}
