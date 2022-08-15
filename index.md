## About

`smartable` JavaScript module enables easy and flexible way of visualising any custom YAML/JSON data (coming from external sources or hosted directly on GitHub) as a feature-rich HTML table.

The JavaScript as well as the generated HTML do not require a dedicated hosting web server. Instead, the Github feature called 'GitHub Pages' is used to host everything a single-page web application.

- [Demos / Examples](demo/index.md) with code explanations is the best way to get into it.
- [Full documentation](USAGE.md) that should answer the rest of the questions, hopefully.

## Why This Exists

There are probably dozens of other smart tables libraries floating about that provide similar functionality. Nevertheless, this one aims to address several rather "unique" requirements:

- Minimalistic library, without complex dependencies on frameworks or hundreds of other modules (npm style).
- Needs to avoid having dedicated hosting (a web / database server) or cloud service just to see some nice HTML tables.
- Should be able to efficiently leverage YAML and/or JSON as its main data source format.
- Should have rather advanced data filtering and data subset displaying features that can be turned into URL links.
- Should allow partial data views (like switching between different sets of columns / or filtering out certain rows by default).
- Should be efficient when working with tables containing thousands of rows.
- Should correctly handle advanced data types such as `range of numbers`, `IP addresses / Subnets` or `Versions Strings`.
- Has to provide CSV exporting functionality that takes into account sorting, filtering and partial data views.

At the time of creation there were no fitting libraries that could easily fulfil all of those goals, so here is "yet another JS library", enjoy.

## Main Features

The generated HTML tables are "smart" as they provide the following features out of the box:
- Advanced filtering using a built-in query syntax that allows creating filters of potentially infinite complexity.
- Flexible options to perform both static and dynamic cell / row / column highlighting (including applying conditional styles, depending on the cell contents).
- Column sorting that is able to recognize various data types and apply the corresponding sorting rules accordingly.
- Out of the box support for 'views' and 'column groups' that allow easy and instant display of data subsets, i.e., a certain selection of columns and/or rows that should be shown or hidden depending on the current 'view' or 'column group(s)' selected by the end user.
- Data exporting (CSV) that is aware of the current views, filters and sorting.
- The web application that enable this functionality runs on the client side, directly inside the web browser, without the need to run any back-end code on a web server. This way of hosting is not a must, but see [Why This Exists?](#why-this-exists) above.

## Limitations

There are certain limitations and assumptions that one needs to be aware of before using the library in its intended way:

- The 'GitHub Pages' (typically expected to be used to host the `smartable` enabled application) does not provide any authorization mechanism, so the generated HTML pages would be openly accessible to all those clients who have ordinary network access to the GitHub server, without the need to provide any credentials (although, hosting the web application on GitHub is not a must - the library can also be hosted on any other web server where any authentication / authorization concept could be realized).
- The framework usage requires at least basic knowledge of modern JavaScript in order to adapt it to custom scenarios and non-trivial data sources processing - you'd be (at least) required to supply your own source data transformation routine to get the source data into the native `smartable` format.
- At least a very basic understanding of how HTML elements and CSS work together would also be required in order to give the resulting HTML the required look and possible advanced UI behaviours.

## Disclaimer

This little framework is not supposed to be universal / super-advanced / feature rich library, not by a long shot. It addresses a very specific use case: serving YAML data as interactive HTML tables (using GitHub pages). There are hundreds of other features and ideas one could potentially bring into this, no doubt. But then again, there are probably hundreds of other JS libraries allowing you to work with structured data anyway. Please understand this and don't ask for new features or support unless something is really broken in the current implementation. I am publishing this on GitHub not to compete with other libraries but rather than a source of inspiration for others. If you cannot make this work for you, please look elsewhere as I cannot afford time for individual support. If you find it useful in your projects, I'd appreciate if you could give my effort some credit or attribution.

Thank you for understanding.
