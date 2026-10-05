---
layout: page
title: plugin
permalink: /plugins/
nav: false
description: catalogo dell'ecosistema plugin in evidenza e inclusi per al-folio v1.x
---

`al-folio` `v1.x` è uno starter con funzionalità runtime gestite dai plugin.
Questa pagina elenca i plugin riconosciuti nel catalogo dell'ecosistema (`_data/featured_plugins.yml`).

## Convenzione dei nomi

- Plugin legati al tema:
  - repo: `al-folio-<funzionalità>`
  - id gem/plugin: `al_folio_<funzionalità>`
- Plugin riutilizzabili:
  - repo: `al-<funzionalità>` o nome neutro
  - id gem/plugin allineato al namespace del plugin

Anche i plugin di terze parti non `al-*` possono essere messi in evidenza.

## Plugin inclusi

{% assign bundled_plugins = site.data.featured_plugins | where: "status", "bundled" %}

<table>
  <thead>
    <tr>
      <th>Nome</th>
      <th>Gem</th>
      <th>ID Plugin</th>
      <th>Compatibilità</th>
      <th>Proprietario</th>
      <th>Demo</th>
      <th>Note</th>
    </tr>
  </thead>
  <tbody>
    {% for plugin in bundled_plugins %}
      <tr>
        <td>{{ plugin.name }}<br><small><code>{{ plugin.repo_url }}</code></small></td>
        <td><code>{{ plugin.gem_name }}</code></td>
        <td><code>{{ plugin.jekyll_plugin_id }}</code></td>
        <td><code>{{ plugin.compat.al_folio_min }}</code> - <code>{{ plugin.compat.al_folio_max }}</code></td>
        <td>{{ plugin.owner }}</td>
        <td><code>{{ plugin.demo_path }}</code></td>
        <td>{{ plugin.notes }}</td>
      </tr>
    {% endfor %}
  </tbody>
</table>

## Plugin solo in evidenza

{% assign featured_only_plugins = site.data.featured_plugins | where: "status", "featured" %}
{% if featured_only_plugins.size == 0 %}
Non ci sono ancora voci solo in evidenza.
Apri una issue **Plugin Feature Proposal** se vuoi proporre il tuo plugin.
{% else %}

<table>
  <thead>
    <tr>
      <th>Nome</th>
      <th>Gem</th>
      <th>ID Plugin</th>
      <th>Compatibilità</th>
      <th>Proprietario</th>
      <th>Demo</th>
      <th>Note</th>
    </tr>
  </thead>
  <tbody>
    {% for plugin in featured_only_plugins %}
      <tr>
        <td>{{ plugin.name }}<br><small><code>{{ plugin.repo_url }}</code></small></td>
        <td><code>{{ plugin.gem_name }}</code></td>
        <td><code>{{ plugin.jekyll_plugin_id }}</code></td>
        <td><code>{{ plugin.compat.al_folio_min }}</code> - <code>{{ plugin.compat.al_folio_max }}</code></td>
        <td>{{ plugin.owner }}</td>
        <td><code>{{ plugin.demo_path }}</code></td>
        <td>{{ plugin.notes }}</td>
      </tr>
    {% endfor %}
  </tbody>
</table>
{% endif %}

## Proporre un plugin da mettere in evidenza

1. Apri una issue **Plugin Feature Proposal** in questo repo.
2. Fornisci i metadati del plugin (URL repo, nome gem, id plugin, compatibilità, percorso demo, contatto del maintainer).
3. Apri una PR aggiornando `_data/featured_plugins.yml`.
4. Se richiedi l'inclusione di default nello starter, includi nella stessa PR gli aggiornamenti a `Gemfile` e `_config.yml`.

Mettere in evidenza e includere sono decisioni separate dei maintainer.
