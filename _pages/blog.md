---
layout: default
permalink: /blog/
title: Blog
nav: false
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  # per_page: NON metterlo qui (vincerebbe sul config): si imposta in _config.yml > pagination.per_page, da admin > Impostazioni
  sort_field: date
  sort_reverse: true
  trail:
    before: 1 # Numero di link prima della pagina corrente
    after: 3 # Numero di link dopo la pagina corrente
---

<div class="post">

{% comment %}
  ELENCO CATEGORIE del blog, in cima e il piu' compatto possibile (il lettore vuole subito le informazioni).
  - Niente titolo del blog (blog_name in _config.yml NON e' piu' usato in questa pagina).
  - DESCRIZIONE OPZIONALE: se scrivi qualcosa in blog_description (_config.yml) compare in una riga piccola sopra le categorie;
    se e' vuota (blank) non viene generato NESSUN elemento, quindi non occupa spazio. Oggi e' vuota.
  - Mostra SEMPRE TUTTE le categorie che esistono nei post (site.categories), in ordine alfabetico, ognuna con il
    numero di post, senza limite e senza taglio. Il link va all'archivio di jekyll-archives (/blog/category/nome/).
  - Per aggiungere una categoria basta usarla in un post: compare da sola. I tag NON sono in questa barra
    (restano sotto ogni post, cliccabili).
  - CSS (l'unico di questa pagina): righe di testo piccolo, separatore "·" con margini minimi, niente icone,
    Per stringere o allargare basta cambiare font-size / gap / margin qui sotto.
  - SPAZIO SOPRA: il tema mette 3rem (classe mt-5) sopra il contenuto; qui lo azzero solo per questa pagina
    (regola .container.mt-5:has(...)), cosi' la lista sta a 1cm dalla riga del menu = il primo valore di "margin: 1cm 0 .5cm".
    Cambia solo quel "1cm" (0.5cm piu stretto, 1.5cm piu largo). Il secondo valore (.5cm) e' lo spazio sotto la lista.
  - NESSUNA RIGA ORIZZONTALE: le righe erano DUE. (1) il tema (main.css) mette a .tag-category-list un border-bottom di 1px
    e un padding-top di 1rem: qui li azzero (border-bottom: 0; padding-top: 0). (2) il tag hr sotto le card in evidenza: tolto.
  - I margini stretti valgono solo per questa pagina: usano selettori .post e .tag-category-list, non toccano il tema.
{% endcomment %}
<style>
  .container.mt-5:has(> .post > .tag-category-list) { margin-top: 0 !important; }
  .post > .tag-category-list { border-bottom: 0; padding-top: 0; margin: 1cm 0 .5cm; line-height: 1.25; font-size: .85rem; text-align: center; }
  .post > .tag-category-list ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 .35rem; list-style: none; padding: 0; margin: 0; }
  .post > .tag-category-list li { margin: 0; padding: 0; }
  .post > .blog-desc { margin: 0 0 .25rem; line-height: 1.25; font-size: .85rem; text-align: center; color: var(--global-text-color-light); }
  .post .featured-posts .mb-4 { margin-bottom: .5rem !important; }
  /* Miniature elenco blog: stessa proporzione per tutte (16:10), ritaglio centrato, mai deformate. Cambia solo aspect-ratio per altri formati. */
  .post .card-img { width: 100%; height: auto !important; aspect-ratio: 16 / 10; object-fit: cover; object-position: center; border-radius: .375rem; display: block; background: var(--global-card-bg-color, rgba(128,128,128,.12)); }
  /* Leggi tutto: pillola con bordo sottile (minimal). Hover: bordo e testo pieni; la freccia scorre di 3px. */
  .post .post-excerpt { margin: 0 0 .9rem; max-width: 65ch; line-height: 1.65; }
  .post .post-readmore { margin: 0 0 .9rem; }
  .post .readmore { display: inline-flex; align-items: center; gap: .5rem; padding: .4rem 1rem; font-size: .875rem; font-weight: 500; line-height: 1.2; color: var(--global-text-color); text-decoration: none; border: 1px solid var(--global-divider-color); border-radius: 999px; transition: border-color .2s, color .2s; }
  .post .readmore svg { transition: transform .2s; }
  .post .readmore:hover { border-color: var(--global-text-color); color: var(--global-text-color); text-decoration: none; }
  .post .readmore:hover svg { transform: translateX(3px); }
  .post .readmore:focus-visible { outline: 2px solid var(--global-theme-color); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { .post .readmore, .post .readmore svg { transition: none; } }
  .post .thumb-link { display: block; } /* miniatura cliccabile: stesso indirizzo del titolo; tabindex -1 perche' il titolo e' gia' il link per tastiera/screen reader */
  .post .thumb-link:hover .card-img { opacity: .9; }
  .post .card-img { transition: opacity .2s; }
  /* Mobile: la miniatura passa SOPRA il titolo (su desktop resta a destra). Solo ordine visivo, il testo resta primo nel codice per screen reader. */
  @media (max-width: 575.98px) {
    .post-list > li > .row { display: flex; flex-direction: column; }
    .post-list > li > .row > .col-sm-3 { order: -1; width: 100%; max-width: 100%; flex: none; margin-bottom: .75rem; }
    .post-list > li > .row > .col-sm-9 { width: 100%; max-width: 100%; flex: none; }
  }
  /* Desktop: la miniatura riempie TUTTA l'altezza del blocco di testo (adattiva: piu' testo = piu' alta), a filo con il bordo; tra un articolo e l'altro resta solo una sottile riga bianca (border-bottom del li). Per cambiare lo spessore: 2px qui sotto. Altezza minima 9rem se il testo e' corto. */
  @media (min-width: 576px) {
    .post .post-list > li { margin: 0; padding: .35rem 0; border-bottom: 1px solid var(--global-divider-color); min-height: 13rem; display: flex; flex-direction: column; justify-content: center; }
    .post .post-list > li > .row { align-items: stretch; margin: 0; flex: 1 1 auto; }
    .post .post-list > li > .row > .col-sm-9 { padding-top: .6rem; padding-bottom: .4rem; }
    .post .post-list > li > .row > .col-sm-3 { position: relative; min-height: 9rem; padding: 0; }
    .post .post-list > li > .row > .col-sm-3 .thumb-link { position: absolute; inset: 0; }
    .post .post-list > li > .row > .col-sm-3 .card-img { width: 100%; height: 100% !important; aspect-ratio: auto; object-fit: cover; border-radius: .375rem; }
  }
  .post > .tag-category-list li + li::before { content: "\00b7"; margin-right: .35rem; color: var(--global-text-color-light); }
</style>
{% assign blog_desc = site.blog_description | strip %}
{% if blog_desc != "" %}<p class="blog-desc">{{ blog_desc }}</p>{% endif %}
{% if site.categories.size > 0 %}
  <div class="tag-category-list">
    <ul>
      {% assign cats_sorted = site.categories | sort %}
      {% for c in cats_sorted %}
        <li><a href="{{ c[0] | slugify | prepend: '/blog/category/' | relative_url }}">{{ c[0] }}</a> ({{ c[1] | size }})</li>
      {% endfor %}
    </ul>
  </div>
{% endif %}

{% assign featured_posts = site.posts | where: "featured", "true" %}
{% if featured_posts.size > 0 %}

<div class="container featured-posts">
{% assign is_even = featured_posts.size | modulo: 2 %}
<div class="row row-cols-{% if featured_posts.size <= 2 or is_even == 0 %}2{% else %}3{% endif %}">
{% for post in featured_posts %}
<div class="col mb-4">
<a href="{{ post.url | relative_url }}">
<div class="card hoverable">
<div class="row g-0">
<div class="col-md-12">
<div class="card-body">
<div class="float-right">
<i class="fa-solid fa-thumbtack fa-xs"></i>
</div>
<h3 class="card-title text-lowercase">{{ post.title }}</h3>
<p class="card-text">{{ post.description }}</p>

                    {% if post.external_source == blank %}
                      {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
                    {% else %}
                      {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
                    {% endif %}
                    {% assign year = post.date | date: "%Y" %}

                    <p class="post-meta">
                      {{ read_time }} min di lettura &nbsp; &middot; &nbsp;
                      <a href="{{ year | prepend: '/blog/' | relative_url }}">
                        <i class="fa-solid fa-calendar fa-sm"></i> {{ year }} </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      {% endfor %}
      </div>
    </div>

{% endif %}

  <ul class="post-list">

    {% if page.pagination.enabled %}
      {% assign postlist = paginator.posts %}
    {% else %}
      {% assign postlist = site.posts %}
    {% endif %}

    {% for post in postlist %}

    {% if post.external_source == blank %}
      {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
    {% else %}
      {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
    {% endif %}
    {% assign year = post.date | date: "%Y" %}
    {% assign tags = post.tags | join: "" %}
    {% assign categories = post.categories | join: "" %}

    <li>

{% if post.thumbnail %}

<div class="row">
          <div class="col-sm-9">
{% endif %}
        <h3>
        {% if post.redirect == blank %}
          <a class="post-title" href="{{ post.url | relative_url }}">{{ post.title }}</a>
        {% elsif post.redirect contains '://' %}
          <a class="post-title" href="{{ post.redirect }}" target="_blank">{{ post.title }}</a>
          <svg width="2rem" height="2rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        {% else %}
          <a class="post-title" href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
        {% endif %}
      </h3>
      {% include estratto.liquid post=post %}
      <p class="post-meta">
        {{ read_time }} min di lettura &nbsp; &middot; &nbsp;
        {{ post.date | data_it: '%d %B %Y' }}
        {% if post.external_source %}
        &nbsp; &middot; &nbsp; {{ post.external_source }}
        {% endif %}
      </p>
      <p class="post-tags">
        <a href="{{ year | prepend: '/blog/' | relative_url }}">
          <i class="fa-solid fa-calendar fa-sm"></i> {{ year }} </a>

          {% if tags != "" %}
          &nbsp; &middot; &nbsp;
            {% for tag in post.tags %}
            <a href="{{ tag | slugify | prepend: '/blog/tag/' | relative_url }}">
              <i class="fa-solid fa-hashtag fa-sm"></i> {{ tag }}</a>
              {% unless forloop.last %}
                &nbsp;
              {% endunless %}
              {% endfor %}
          {% endif %}

          {% if categories != "" %}
          &nbsp; &middot; &nbsp;
            {% for category in post.categories %}
            <a href="{{ category | slugify | prepend: '/blog/category/' | relative_url }}">
              <i class="fa-solid fa-tag fa-sm"></i> {{ category }}</a>
              {% unless forloop.last %}
                &nbsp;
              {% endunless %}
              {% endfor %}
          {% endif %}
    </p>

{% if post.thumbnail %}

</div>

  <div class="col-sm-3">
    {% comment %} alt = thumbnail_alt (campo dell'admin) o, se vuoto, il titolo: mai alt="immagine" generico (SEO/accessibilita). {% endcomment %}
    {% comment %} MINIATURA LEGGERA come in _layouts/post.liquid: se esiste assets/img/cover/nome.jpg (1200 px, creata dall'admin) si usa quella, altrimenti l'originale. thumbnail_hd: true forza l'originale. Tutto su una riga con trattini: niente righe vuote dentro il blocco HTML. {% endcomment %}{%- assign th_src = post.thumbnail -%}{%- unless post.thumbnail_hd == true or post.thumbnail_hd == 'true' -%}{%- assign th_fn = post.thumbnail | split: '/' | last -%}{%- assign th_ext = th_fn | split: '.' | last -%}{%- assign th_n = th_fn.size | minus: th_ext.size | minus: 1 -%}{%- assign th_base = th_fn | slice: 0, th_n -%}{%- assign th_rel = 'assets/img/cover/' | append: th_base | append: '.jpg' -%}{%- assign th_abs = '/' | append: th_rel -%}{%- assign th_file = site.static_files | where: 'path', th_abs | first -%}{%- if th_file -%}{%- assign th_src = th_rel -%}{%- endif -%}{%- endunless -%}
    {% if post.redirect == blank %}{% assign thumb_href = post.url | relative_url %}{% elsif post.redirect contains '://' %}{% assign thumb_href = post.redirect %}{% else %}{% assign thumb_href = post.redirect | relative_url %}{% endif %}
    <a class="thumb-link" href="{{ thumb_href }}"{% if post.redirect contains '://' %} target="_blank" rel="noopener"{% endif %} tabindex="-1" aria-hidden="true"><img class="card-img" src="{{ th_src | relative_url }}" loading="lazy" alt="{{ post.thumbnail_alt | default: post.title | escape }}"></a>
  </div>
</div>
{% endif %}
    </li>

    {% endfor %}

  </ul>

{% if page.pagination.enabled %}
{% include pagination.liquid %}
{% endif %}

</div>
