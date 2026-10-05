---
layout: page
title: servizi
nav: false
permalink: /servizi/
---

<style>
.srv-t{width:100%;border-collapse:separate;border-spacing:8px;margin:6px 0 26px}
.srv-t td{width:33.33%;padding:9px 12px;border:1px solid rgba(0,0,0,.12);border-radius:10px;background:#fffdf5;font-size:.9rem;line-height:1.3;vertical-align:top}
.srv-t td small{display:block;opacity:.65}
.srv-t td:empty{background:none;border:0}
.srv-t td{position:relative}
.srv-t td a{color:inherit;text-decoration:none}
.srv-t td a::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:10px}
html[data-theme="dark"] .srv-t td{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15)}
@media(max-width:600px){.srv-t,.srv-t tbody,.srv-t tr,.srv-t td{display:block;width:100%}.srv-t{border-spacing:0}.srv-t td{margin-bottom:6px}.srv-t td:empty{display:none}}
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
