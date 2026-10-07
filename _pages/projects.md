---
layout: page
title: Progetti
permalink: /projects/
description: Una collezione in crescita dei tuoi progetti più interessanti.
nav: true
nav_order: 3
display_categories: [work, fun]
horizontal: false
---

<style>
/* CARD BIANCHE (stesso stile di home e /servizi/, senza icone): fondo bianco FISSO anche in tema scuro, testo scuro fisso, bordo sottile, angoli 22px, ombra morbida, sollevamento all'hover.
   Selettori con .card.hoverable per battere gli stili del tema. Se ritocchi lo stile, ritoccalo anche in _pages/home.md e _pages/servizi.md. */
.projects .card,.projects .card.hoverable{background:#fff;color:#1f2933;border:1px solid #e6e8ec;border-radius:22px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.12);transition:transform .25s ease,box-shadow .25s ease}
.projects .card:hover,.projects .card.hoverable:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(16,24,40,.05),0 16px 32px -14px rgba(16,24,40,.2)}
.projects .card .card-body{padding:18px 22px}
.projects .card .card-title{color:#111827}
.projects .card .card-text,.projects .card p{color:#3a4552;font-size:.94rem;line-height:1.5}
@media (prefers-reduced-motion:reduce){.projects .card{transition:none}.projects .card:hover{transform:none}}
</style>

<!-- pages/projects.md -->
<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  <!-- Mostra i progetti per categoria -->
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}">
    <h2 class="category">{{ category }}</h2>
  </a>
  {% assign categorized_projects = site.projects | where: "category", category %}
  {% assign sorted_projects = categorized_projects | sort: "importance" %}
  <!-- Genera le card per ogni progetto -->
  {% if page.horizontal %}
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}

{% else %}

<!-- Mostra i progetti senza categorie -->

{% assign sorted_projects = site.projects | sort: "importance" %}

  <!-- Genera le card per ogni progetto -->

{% if page.horizontal %}

  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_projects %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
{% endif %}
</div>
