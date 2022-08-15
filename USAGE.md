# SMARTABLE

<br>

## Table of Contents

- [General Information](#general-information)
  - [Versioning](#versioning)
  - [GitHub Pages](#github-pages)
  - [Custom Web Server](#custom-web-server)
- [Basic Concepts](#basic-concepts)
- [Specs](#specs)
  - [Table Specs in a Separate YAML File](#table-specs-in-a-separate-yaml-file)
  - [Inline Table Specs](#inline-table-specs)
  - [Mixed Specs (External URL plus Inline)](#mixed-specs-external-url-plus-inline)
  - [Default Specs](#default-specs)
- [Source Data](#source-data)
  - [JSON Data Sources](#json-data-sources)
  - [YAML Data Sources](#yaml-data-sources)
  - [Data Converter and Custom Data Sources](#data-converter-and-custom-data-sources)
  - [Source Data Post-processing](#source-data-post-processing)
- [HTML elements and CSS](#html-elements-and-css)
  - [Required HTML elements](#required-html-elements)
  - [Optional and Custom HTML elements](#optional-and-custom-html-elements)
  - [Default CSS Classes](#default-css-classes)
  - [Custom CSS Classes](#custom-css-classes)
- [Callbacks and Triggers](#callbacks-and-triggers)
  - [Predefined Callbacks](#predefined-callbacks)
  - [The Callback Argument](#the-callback-argument)
  - [Predefined Triggers](#predefined-triggers)

<br>
<br>

## General Information

What is `Smartable`?

- A [standard JavaScript / ES module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) that dynamically generates HTML tables with [extended features](index.md#main-features).\
It has to be used with up-to-date browsers as many of the JS language features require that (starting with [ES6 modules](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/) support) .

- Can be enabled on a web page using the [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) directive, see how it's done in [this example](https://github.com/uncle-fed/smartable/blob/main/demo/example02/main.mjs#L1).\
Note that code that usually imports the `smartable` module is *also an ES6 module* and should be [loaded as such](https://github.com/uncle-fed/smartable/blob/main/demo/example02/index.html#L10).

- Comes as a [minified](https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs") source which is the preferred way of loading the module.\
There is also a [formatted](https://uncle-fed.github.io/smartable/src/smartable.mjs) source code available, should it ever be needed instead.

- A single-file module, that can use additional features provided by other 3rd party libraries ([jsYaml](https://github.com/nodeca/js-yaml) / [Luxon](https://github.com/moment/luxon)).\
`smartable` is capable of loading those libraries dynamically, on demand (only if needed).

- Comes with a helper script [`badbrowser.js`](https://github.com/uncle-fed/smartable/blob/main/demo/example00/index.html#L20) that should be enabled via the `<script nomodule>` tag.\
This is not a must but rather a nice way of signalling end users that their browser version is outdated.\
If the script is enabled, a message will show up in those browsers that do not support ES modules.

<br>

### Versioning

GitHub Pages do not allow serving a particular revision/tag/release of the same file and always serve the latest one.\
For this reason (and not only) it is highly recommended to use CDN to load the library instead of linking to GitHub Pages directly.\
The CDN URLs allow specifying GitHub project's release version, thus, it's best to use something like the following:

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
```

The minor versions of `smartable` framework should never introduce breaking changes.\
If the page works with version `1.0`, all features should keep working same way with version `1.1` or `1.9` or anything in between.\
In other words, the path in the CDN URL can contain the same "truncated version" part `@1` for all `1.x` versions of the library.

The current latest of the `smartable` library is `1.0`.

<br>

### GitHub Pages

For a custom project hosted on GitHub, it makes sense to import the minified `smartable` module [from CDN](ttps://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs).\
It is strongly discouraged to fork the `smartable` repository or copy its JS module to another GitHub repository.\
The code in the original `smartable` repository could get fixes and updates and thus the forked version would be out of sync.

Please use the CDN URL whenever possible, see [more examples here](demo/index.md).

<br>

### Custom Hosting

It is also possible to use `smartable` library in any custom project that does not rely on GitHub for hosting.\
That would make sense if, for some reason, the clients would have restricted Internet access (or no Internet access at all).

In case the library is copied to be hosted some place else, be aware that it may require two additional libraries / JS modules:

- `jsYaml` (if any of the source data or specs is in YAML format)
- `Luxon` (if custom date / time formatting is to be used)

Normally those two libraries are loaded by `smartable` as dependencies (only if required by a particular custom configuration).\
For this reason, the `smartable` source code contains [the URLs for loading those libraries](https://github.deutsche-boerse.de/dev/smartable/blob/master/v1/src/smartable.mjs#L1-L2).\
If the `smartable` module is moved away from GitHub, make sure that those URLs are still reachable by the clients.\
If needed, adjust the URLs accordingly (directly in the source code), so that they correctly point to the new hosting location.

Additionally, one could consider using the `badbrowser.js` script in a custom project, as described in the [section above](#general-information).

<br>
<br>

## Basic Concepts

NOTE: A thorough description of the **supported data types** is provided in a [separate document](TYPES.md).

Once the `smartable` module has been included in the custom code, the `smartable` framework needs to be initialised.\
Several things are required so that the final table has the desired look and features.\
The first two requirements are an absolute must, the rest is optional, depending on the needs.

1. `Table specs`\
 The definition of what the columns order should be, how the columns should be named, what type of data will be contained in each column, what partial data views or column groups the table should have (if any), should the table enable sort, filter or export options, should some custom CSS classes and custom date/time formatting be applied, etc.

2. `Data source(s)`\
One (or more) files in YAML or JSON format that will be used to populate the table with values.\
The URL(s) containing the source data hosted anywhere where the client would be able to reach via HTTP(S) should be provided.

3. `Data converter function`\
It is possible to provide custom JavaScript function that will get triggered automatically by the `smartable` framework once the raw data has been fetched from the source URLs. This data will serve as the input for the custom function which will have to perform the required manipulations that would bring the data into the "native" `smartable` format.

4. `Custom HTML elements`\
The framework needs to construct more than just a `<table>` HTML tag inside a web page. Firstly, it needs an HTML block that would be used for displaying general errors, if something goes wrong during the data loading or YAML/JSON parsing, secondly it would require a block where the filtering syntax should be explained (something like a help text) that would be hidden by default and would open if the user clicks the "filter help" button. Lastly, it would need the `<table>` element to be constructed out of the source data and specs. These three major blocks will be automatically created and inserted into the HTML if they do not exist in HTML from the start. By default, the `smartable` framework would try and make a "best guess" about what elements are already on the web page and what needs to be created in addition. It is also possible to create a custom HTML layout in advance and then specify what existing HTML element should be used for what purpose (during `smartable` initialisation).

5. `Custom CSS styling`\
The resulting table would need to have a particular look, which is possible to define through a standard CSS code. The `smartable` framework will automatically attach certain predefined CSS style names to the generated table elements (which are also possible to override). There is no "minimum required CSS" for the table to work properly in terms of sorting or filtering or exporting, but if no CSS at all is provided, the table would be rendered with the default browser styles. The [examples](demo/example03/index.css) that are provided in this repository should provide the initial idea that can be taken further in custom projects.

6. `Custom callbacks and triggers`\
The library provides source data display that comes with features like sorting, filtering and exporting out of the box. Sometimes it is needed to take it a bit further and add custom controls and HTML elements to the table page that provide further interactions with the table data. For example, one could place several HTML `<button>` elements on the page which would instantly change to another (predefined) `view` (that shows data subset or a particular set of columns only). Another use case would be to display a total (or partial) count of table rows that updates dynamically every time a user applies certain data filter. One may want to apply custom CSS styles to certain table cells or rows, depending on the contained values (the so-called "dynamic styling") and so on. All of this and more is possible using the `callback` and `trigger` features. The `smartable` framework will try and execute custom functions (i.e. callbacks) when certain events occur within the table and it also allows to trigger updates to the table rows following custom user actions. For instance, it would be possible to define a custom callback function that would be performed every time the table body is (re)rendered, so that the count of currently displayed table rows could also be updated dynamically on the page.

Many of the required parameters described above have certain predefined values, to the point where it is actually possible to only provide a subset of most basic `specs` plus some `source` data to get a fully operational `smartable` instance without any custom JavaScript functions, converters, callbacks, custom logic, etc. This, of course, assumes that the source data is already formatted precisely as "expected" by the framework and does not require any further processing. It is illustrated in the [`example00`](demo/example00/index.html) and  [`example01`](demo/example01/index.html), where the difference is only how the `specs` are provided (external YAML in the `example00` vs inline JS object in the `example01`).

The absolutely minimal code to start things going would be something of this kind, within the HTML `<head>`:

```html
<script type="module">
  import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
  smartable();
</script>
```

This simply loads the `smartable` module and initialises it with all the default parameters. Naturally, this does *assume a lot* and rely on several things to be found in *expected places* and in an *expected format*.

In fact, what happens is that the `smartable()` initialiser is engaged with the following defaults that are "hardcoded" in the `smartable` library when no custom values are supplied:

```js
{
    specs: "specs.yml",
    source: {data: "data.yml"},
    converter: (raw, final) => final.push(...raw.data)
}
```

The above means that the `specs` (such as column definitions) are expected to be found in the file called `specs.yml` which should be located in the same directory with the `index.html`. The source data would be coming from the file called `data.yml` (also located there). Finally, the (default) `converter` function will be applied to the source data, and that function is defined to simply take the objects found in the raw `data.yml` and copy them to the final `smartable` data array structure "as is", i.e. with no changes whatsoever. This is how the [`example00`](demo/example00/index.html) and  [`example01`](demo/example01/index.html) are built, so it is worth to examine their complete HTML and JS source to understand this better.

<br>
<br>

## Specs

The table `specs` object the essential part of the `smartable` instance creation and cannot be omitted.\
Table specs can be passed to the `smartable` initialiser either through an external URL where specs object can be read from (YAML or JSON), or directly specifying it "inline" as a JavaScript object, or both at the same time (in which case the final specs will be the product of external file overlaid with the inline definitions).

Specs provide the following information:

- `table`: the *column definition* for the table - a must without which nothing will work, there is no predefined definition.
- `options`: the *table options* - not a must (as all of the table options have predefined values listed below).
- `cssClass` : custom *CSS Class names* for the table and other page elements, this allows to override the predefined CSS class names
- `views`: the *table view definitions* - not a must, but will be required if the `views` feature is required.

<br>

### Table Specs in a separate YAML file

In this example, all of the specs are contained in a separate YAML file called `specs.yml` in a directory called `path`.

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
smartable({
  specs: "./path/specs.yml"
});
```

The contents of the specs YAML file could be similar to the following.\
There the `options`, the `cssClass` and the `table` definitions are provided, but no `views`:

```yml
options:
  filter: false
  export: false

cssClass:
  smartable: my-smartable-css-class

table:
  - col1:
      header: Some Column
      type: num
  - col2:
      header: Another Column
```

<br>

### Inline Table Specs

Using the same data as the example with the separate YAML file above, the inline table specs could be looking as follows:

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
smartable({
  options: {
    filter: false,
    export: false
  },
  cssClass: {
    smartable: "my-smartable-css-class"
  },
  table: [
    {col1: {header: "Some Column", type: "num"}},
    {col2: {header: "Another Column"}}
  ]
});
```

Note, that the property called `specs` is not used in this case. It is only needed in order to specify the external `specs` file. If it's planned to supply all the specs inline, there is no need to set the `specs` property, instead the  `table`, `options`, `cssClass` and `views` should be supplied directly as the properties of the initialiser object.

<br>

### Mixed Specs (external URL plus Inline)

Sometimes it makes sense to supply a part of the specs in an external file (typically static specs, such as column definitions) and then provide additional specs inline (as a dynamically generated JavaScript object). It could happen if some of the specs (`views` definitions, for instance) have to be generated dynamically during page load as they could depend on certain conditions that are not known in advance. In these case a mixed approach can be used, as follows:

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
smartable({
  specs: "./path/specs.yml",
  options: {filter: myFilterSetting()}
  views: {default: myDefaultViewName()}
});
```

In this example, all possible specs would be read from the `./path/specs.yml` first, and after that the `options.filter` will be set to its final value dynamically calling a custom user function `myFilterSetting()` in the initialiser and the default view `views.default` value will also be dynamically generated by calling another custom function that could be `myDefaultViewName()`, for example.

This way any part of the `specs` can be supplied as static URL and then fully or partially overwritten by the dynamically generated inline parameters. The only exception from this is the `table` column definition. If the `table` is explicitly specified inline, then the path to the external file (i.e. the value of the `specs` property) will be ignored and no external specs would be loaded at all.

<br>

### Default Specs

When some/all specs are omitted then the default values take place.\
Below is the complete breakdown of all specs that can be set via an external file or inline, together with the correct specs data structures and their default values.

A working sample of a specs file could be found [here](demo/example02/specs.yml) or [here](demo/example03/specs.yml).


```yml
options:
  sort: true
  filter: true
  export: true
  colGroups: false
  defColGroups: none      #  by default all defined column groups will be hidden
  dateFormat: YYYY-MM-DD  #  the date part of the ISO date format only
  htmlAlt: <data-type>    #  if cell value does not match column definition, then simply show its data type

cssClass:
  badValue: -smartable-bad-value
  export: -smartable-export
  filterable: -smartable-filterable
  filterApply: -smartable-filter-apply
  filterClear: -smartable-filter-clear
  filterError: -smartable-filter-error
  filterHelp: -smartable-filter-help
  filterInput: -smartable-filter-input
  help: -smartable-help
  smartable: -smartable
  sortable: -smartable-sortable
  sortAsc: -smartable-sort-asc
  sortDesc: -smartable-sort-desc

table:
  # column definition must be explicitly provided, however each column definition
  # may also omit some or all of its properties and rely on their defaults.
  # the entire column definition must be a YAML list (or JSON array) of Objects,
  # where each Object should describe a single column, such as:

- <column_id1>: # the same string key that should match the source data key of a particular column
      header: # column header text for the table (if omitted, <column_id> value will displayed)
      type: # can be omitted (str is assumed) or one of the following: str, num, range, ip, date, ver
      htmlAlt: # a string that will be displayed instead of bad values, can be omitted (the options.htmlAlt will be used)
      dateFormat: # if column type is 'date', custom date formatting can be set (otherwise.dateFormat will be used)
      cssClass: # a string or a list (array) of CSS class names that will be applied to the column, no default
      colGroup: # a string that is the key of a column group that the column belongs to (if colGroups feature is used)

views:
  # views have no initial predefined values and must be explicit in every way,
  # they can be completely omitted too (which can be treated as the "predefined value of no value")

  default: # optional, can be one of the <view_id> labels defined below, that would be displayed if no view was chosen

  <view_id>: # the string identifier for a particular view, used in the URL or by calling updateView(view: <view_id>);
    rows: # the (optional) filter string that would be the same as the usual filter, allows to display subsets of rows
    cols: # the (optional) list/array of column_id (defined above) in the 'table' definition; empty list = all columns
      - <column_id1>
      - <column_id2>
      - ....
      - <column_idX>
```

<br>
<br>

## Source Data

Each table will require some source data to be displayed. The procedure of getting the source data into the table runs only once during the initial table loading and will never repeat again (like when table is sorted, filtered, exported or a view or column group is applied). Only full page reload will trigger the entire data initialisation again.

The process of supplying source data to the framework generally looks as follows:

1. Data is loaded from one or more URLs (as a raw/plain text, at this initial stage). If the URL cannot be loaded, the processing stops and the error will be displayed instead of the data table.
2. If the loaded raw data is formatted as YAML or JSON it will be automatically converted into the native JavaScript objects, otherwise the user is expected to custom-parse loaded raw plain text into JavaScript at the next step.
3. The framework will run a `converter` function (that can be supplied as a custom JavaScript code) to transform the initial raw data into the structure that `smartable` is able to process further. There is a predefined built-in converter supplied with the `smartable` code but it will only copying the data "as is", so it is expected that the data must already be format "correctly". Ordinarily, it is not possible to guess the logic behind the source data in every particular case, so the user would be required to provide their own code to handle that.
4. The `smartable` will apply the [`specs`](#specs), described above to the loaded data, where each data value will be enriched with metadata about how it should be displayed, sorted, highlighted, etc.
5. After applying the `specs`, the user is given another (optional) opportunity to apply extra metadata (or change the current one) to fit further custom requirements. This is where dynamic data highlighting can happen by setting appropriate CSS classes on certain data cells or rows depending on the data values.

The `smartable` framework natively supports loading and processing data sources that have their data formatted as YAML or JSON. However, this is not a must. In principle, source data could come from any source as long as it is possible to fetch it via HTTP(S) but then, it is a bit more work during initial implementation to get the data into the "native" `smartable` format.

In general, one or more data source URLs can be passed to the `smartable` init routine via the `source` object, for instance:

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
smartable(
  {
    specs: "./path/specs.yml",
    source: {
      myJSONsrc: "./path/myJSONfile.json",
      myYAMLsrc: "https://some-web-site/myYAMLfile.yml",
      myCSVsrc: "./anotherpath/plaintext.csv"
    }
  }
);
```

In the example above, 3 data sources are used, each of a different type. The YAML source being hosted on a 3rd party web site (make sure that [CORS headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) are set up correctly).

The `source` object's properties (such as `myJSONsrc`, `myYAMLsrc` and `myCSVsrc` in the example above) are important as they are going to become the identifiers for accessing the loaded source data later on, when the [data converter](#data-converter-and-custom-data-sources) routine is engaged.

<br>

### JSON Data Sources

Since JSON is a subset of JavaScript, it is the easiest data format to parse and process. No extra libraries or modules would be needed if the source data comes JSON formatted. Note, that in order for the source data to be recognised as JSON automatically, it should be served with the correct HTTP `Content-Type` header:

```
Content-Type: application/json
```

<br>

### YAML Data Sources

YAML data is more convenient to work with for a human but it is not a format that is recognised natively by JavaScript. So, before `smartable` is able to process the YAML formatted structures, a conversion from YAML is required. This is performed by a 3rd party library [jsYaml](https://github.com/nodeca/js-yaml), which is included with the `smartable` framework. This library is not loaded by default but if YAML sources are detected, `smartable` framework will try to load the jsYaml library automatically and will try and use it to convert the source data, also automatically.

In order for `smartable` to recognise the data source as YAML, it needs to be served with one of the following HTTP `Content-Type` headers:

```
application/x-yaml
application/x-yml
application/yaml
application/yml
```

<br>

### Data Converter and Custom Data Sources

The data converter is a custom function that should be supplied to transform the source data if the data goes beyond the native structures expected by `smartable` during initial load. This function will only run once as a part of source data initialisation and won't be triggered again if table is filtered, sorted or the views/column groups are changed.

The "standard structure" is essentially an array, where each array member is an Object representing a complete table row.\
Object's properties would be the column keys and the property values would be the cell values.

It is best illustrated by an example such as [this one](demo/example00/data.yml). If the source data already follows this exact structure, then no custom converter is needed and it will simply be loaded as is without an issue.

Otherwise, a custom `converter` function needs to be created to process the initial data. The function will be automatically called by `smartable` framework at the appropriate stage with two arguments:

- The first argument will be the Object containing all of the loaded source data (the object keys will be the same as the ones defined in `source` earlier).
- The second argument will contain a pre-initialised empty array that will have to be populated with the Objects representing table rows.

Important: please make sure to treat the second argument as already existing array that needs to be *modified* with `Array.push()`, etc.\
Do not try to use direct assignment operator to simply *redefine* the data array as it will result in an error.


```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
smartable(
  {
    specs: "./path/specs.yml",
    source: {
      myJSONsrc: "./path/myJSONfile.json",
      myYAMLsrc: "https://some-web-site/myYAMLfile.yml",
      myCSVsrc: "./anotherpath/plaintext.csv"
    },
    converter: myCustomDataConverter
  }
);

function myCustomDataConverter(raw, native) {

  for (const [id, data] of Object.entries(raw)) {
    console.log(`Loaded raw data with the ID ${raw.id}, the contents of it is: ${raw.data}`);
  }

  // perform some manipulations with the data in raw.myJSONsrc, raw.myYAMLsrc, raw.myCSVsrc
  // ...
  // and, for example, we arrive to some final combined data array called 'final'

  // this 'final' array should be the array of Objects where each Object represents future table row;
  // then we can push objects into the native (final) array:

  final.forEach(row => native.push(row));
}
```

Using the `converter` function allows to skip loading any data from external URLs as the data could be also generated dynamically and put into the required structure just as if it was loaded externally. Consider this complete working example below where a table of 2 columns and tree rows is generated without loading any external sources or even `specs`, i.e. everything is being handled *inline*:

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
smartable({
  table: [
    {col1: {header: "Prefix", type: "num"}},
    {col2: {header: "Country Code", type: "str"}}
  ],
  converter: (_void, data) => {
    data.push({col1: 49, col2: "DE"});
    data.push({col2: 420, col2: "CZ"});
  }
);
```

Last, but not least, the example above shows that the `converter` function inserts very simple Objects such as `{col1: 49, col2: "DE"}` representing a row with two columns. In vast majority of cases this would be good enough. However, to give more control over how the data should be handled once the table is built, `smartable` is capable of recognizing a more complex structure in place of those simple values like `49` or `"DE"`.

 Instead of a single value it is possible to specify an Object that describes more aspects of how the value should be treated for sorting, filtering, dynamic highlighting, bad values, etc. The complete object that can be specified as a cell value looks as follows (it is not a must to supply every single property, except for the `value` which is mandatory):

```js
<column_key>: {
  value: ...      // the original "raw" value, as is; must be given
  html: ...       // a string that will be displayed in the HTML table instead of the raw value
  match: ...      // case insensitive string representation that will be used for filtering
  cmp: ...        // a numeric or hashed-string representation for comparison and sorting
  cmpMin: ...     // min integer, for the 'range' and 'ip' column types and '<' comparison only
  cmpMax: ...     // max integer, for the 'range' and 'ip' column types and '>' comparison only
  mask: ...       // integer netmask representation, for the 'ip' data type and '@=' comparison only
  htmlAlt: ...    // a string that will be displayed in the table if the value is 'bad'
  dateFormat: ... // custom date/time formatting string that overrides column-wide or table-wide definition
  cssClass: ...   // additional CSS class(es) to be given to a single cell (good for dynamic highlighting)
}
```

Even if the structure described above is not supplied by the `converter` function, it will be created for each table cell automatically anyway, as a part of applying `specs` to the data cells (during the so-called "data normalisation" step that follows the `converter` step). The normalisation would use predefined algorithm to obtain all those various data properties (such as `.cmp` and `.match`) from the initial raw value. By providing some or all of these properties as a part of data `converter` makes it possible to override the automated logic [described here](TYPES.md#internal-representation-of-a-value).

For example, an actual raw value for a column called `state` could be one of three: `green`, `yellow` or `red` but it is required to have a particular sorting order (instead of alphabetical), also it could be required that an actual traffic light PNG image is displayed in the table cell instead of a string like "red". Consider the following, then:

```js
function converter (_void, data) {

  const colourOrder = {red: 3, yellow: 2, green: 1};

  for (i=0; i < rows_num; i++) {

    const rawValue = getMyValue();  // gets either 'red', 'yellow' or 'green' from some other place

    const cellObj = {
      value: rawValue,
      html: `<img src="${rawValue}.png" alt="${rawValue}" />`,
      cmp: colourOrder[rawValue]
    }

    data.push({state: cellObj, ...});
  }
}
```

More in-depth information about internal data structures describing table cells and how they work together with the data types defined in `specs` are given in a [separate document](TYPES.md).

<br>

### Source Data Post Processing

Sometimes it could be required to manipulate the data structures after all of the source data has been loaded *and* normalised but just *before* it is rendered as an actual table for the very first time.

A very good example of this is the following use case: there is a table where one column is some date/time that is supplied as human readable time stamp and it is required to highlight those table cells (or rows) where the time stamp is older than a certain date or interval in the past.

One way of doing it would be checking the date value directly inside the `converter` function and then deciding if custom highlighting should be applied (by assigning custom CSS class). This however, means, that the human readable time stamp should first be parsed as a native JavaScript object. Only then it would be possible to tell if it should use highlighting or not. But what if there is incorrect format of date in some cells or even missing values -- those would require special handling, etc.

`smartable` allows to avoid writing all of that custom Date parsing / checking code. If a column type is declared as a `date`, the framework will automatically convert human readable dates into integers during the standard normalisation step (that automatically comes *after* the `converter` step). Normalisation will have all those cell properties, such as `.cmp` and `.match` populated with the correct values, and for the `'date'` column type, the `.cmp` value will contain the Unix timestamp (in milliseconds) matching the original human-readable raw date (or zero in case of some bad original value). Thus, the `.cmp` field can be used directly to make a highlighting decision.

This is precisely how it is done in the [example here](https://github.com/uncle-fed/smartable/blob/main/demo/example03/main.mjs#L43-L45) in the function `customInitData()` that will be called automatically by `smartable` framework *after* the [`converter`](https://github.com/uncle-fed/smartable/blob/main/demo/example03/main.mjs#L22-L29) has finished its work and *after* the normalisation is done but *before* the table is rendered first time ever.

This is possible thanks to the `callback` feature that allows to run any custom code during different stages of the `smartable` lifecycle.

More in-depth information is given below in the section describing the [Callback Principles](#callbacks-and-triggers).

<br>
<br>

## HTML elements and CSS

The `smartable` framework largely deals with realising the logic of data loading (data conversion, normalisation, corner cases handling for data types, etc.), building the required HTML for the table and providing features of data exporting, sorting and filtering with its advanced *query syntax*. It is not the framework that deals with *how things look* on the page in terms of styling and CSS.

The maximum that `smartable` does is attaching certain CSS class *names* (not the CSS class definitions!) to page elements when building the initial table view. Those class names are either predefined or can be custom supplied by the user through the `specs`. Other than that, the `smartable` does nothing more for the page styling: it does not define any CSS styles and it does not change any CSS properties of HTML elements whatsoever. The CSS class names attached to the elements have to be defined by the user independently.

It follows from that that all the styling for the table and the elements around it should be supplied by the user and the user is fully responsible for how things look like on the page. The [examples](demo/example03/index.css) that come with this documentation do include the CSS styles definitions that make things look reasonable and can provide initial basis for other custom projects.

<br>

### Required HTML elements

The `smartable` framework actually needs no elements at all to be present on the HTML page in order to function correctly.\
It is programmed to inject the required elements into the document `body` if they are not explicitly declared.

For example, the HTML code below is a 100% valid, fully working code that needs nothing else in the document `body` to operate normally.\
Provided that there is valid `source` data and `specs` available, it will produce a legitimate table on the page that will use the CSS styles defined in `mystyles.css` file.

```html
<!doctype html>
<html lang="en">
<head>
    <title>My Smartable Page</title>
    <link href="mystyles.css" rel="stylesheet">
    <script type="module">
        import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";
        smartable({source: "mydata.yml", specs: "myspecs.yml"});
    </script>
</head>
<body>
</body>
</html>
```

If the generated HTML is examined once the table is displayed, one can see that the `smartable` has injected 2 top-level HTML elements into the page body, namely the ones with the `<output>` and the `<table>` tags:

```html
<body>
  <output class="-smartable-error" hidden>
    <!-- the inner content of this element is empty by default
         but if there is an error during specs or source data loading
         it would be displayed inside this element
         and its "hidden" HTML attribute would be removed -->
  </output>
  <table class="-smartable">
    <caption><!-- empty by default, needs to be manipulated by the user --></caption>
    <thead><!-- will contain all the <th/> elements as per specs / table / view / colgroup definitions --></thead>
    <tbody><!-- will contain all the visible table rows that match the current view and filter --></tbody>
  </table>
</body>
```

The above example is for the case where `filter` was set to `false` in the `specs`.\
In case filtering option is enabled, one more element with the `<article>` tag would be injected into the page body:

```html
<body>
  <output class="-smartable-error" hidden></output>
  <article class="-smartable-help" hidden>
    <!-- here would be a very very long HTML snippet that describe filter syntax;
         this HTML code will be injected into the <article> automatically
         if the `filter` option is not set to `false` -->
  </article>
  <table class="-smartable">...</table>
</body>
```

Notice the special CSS classes such as `-smartable`, `-smartable-error` and `-smartable-help` that are automatically assigned to the new elements. It is possible to refer to these class names and create their CSS definitions to style the error, help and main table elements through a custom CSS file.

It is also possible to override those CSS class names with own desired names and provide them in the table `specs` via the `cssClass` property.  [See above](#default-specs) for the complete list of the CSS classes that `smartable` uses internally and their [detailed explanations below](#default-css-classes).

The only CSS class name that cannot be overridden is the `-smartable-error` (for the `<output>` element that is responsible for displaying critical errors). This is because the error element could already be displayed before the `specs` with custom CSS class names are loaded from an external URL, so it wouldn't be possible to override the class name from `specs`.

The three elements shown above (`<table>`, `<output>` and `<article>`) are the only ones that will ever be added to the page automatically (if they don't already exist). However, filtering and exporting features require more HTML elements to be present on the page (like text inputs, submit buttons, etc). These extra elements will never be created by `smartable` and will have to be present in the document during the `smartable` initialisation. [Next section](#optional-and-custom-html-elements) contains more information about this.

Sometimes the initial HTML would need to be more complex than a blank page with no elements. For example, the error HTML block or the main table could be located in a more sophisticated structure than a simple `<output>` or `<table>` element directly at the root of the document `<body>`. The framework allows full flexibility here and provides a way to specify *any* custom HTML element to be used for the desired purpose instead of the auto-created / default elements.

For instance, custom HTML could look the following way:

```html
<body>
  <header>
    <div id="filter-help-text" hidden></div>
  </header>
  <main>
    <table id="main-table"></table>
  </main>
  <footer>
    <div id="page-errors"></div>
  </footer>
</body>
```

Then the `smartable` could be initialised as follows:

```js
smartable({
  source: "mydata.yml",
  specs: "myspecs.yml",
  html: {
    error: document.body.querySelector("#page-errors"),
    table: document.body.querySelector("#main-table"),
    help: document.body.querySelector("#filter-help-text")
  }
});
```

In general, the algorithm followed by `smartable` regarding the "must-have" HTML elements is the following:

- For the HTML block that should be used to display data / initialisation errors:
  - Use the custom element supplied inline as `html.error` during the table initialisation. Note that it does not necessarily have to be use the `<output>` tag, as shown in the above example. It can be literally any other container element. For instance it could be a `<div>` or `<p>` or `<section>`, etc.
  - If no element was provided inline, then check the document body for any `<output>` elements that *DO NOT* have their `name` property set to `"badfilter"` and use the first one encountered. The `<output name="badfilter">` is reserved for filter errors (see next section). Usually this means: "use the first encountered `<output>` element with no special name set".
  - If no suitable elements were located on the page, then create new `<output>` element and inject it after all other elements into the `<body>`.

- For the main `<table>`:
  - Use the custom element supplied inline as `html.table` during the table initialisation.
  - If no element was provided by the user, then check the document body for any `<table>` tags and use the first one encountered.
  - If no suitable elements were located on the page, then create new `<table>` element and inject it after all other elements into the `<body>` (meaning, also after the possibly auto-created `<output>` element above).

- For the block that should contain filter syntax help text (needed only if filtering is enabled in the `specs.options`):
  - Use the custom element supplied inline as `html.help` during the table initialisation (just like with the error block, this does not necessarily have to be an `<article>` element but can be any "container" element such as `<div>`).
  - If no element was provided by the user, then check the document body for any `<article>` tags and use the first one encountered.
  - If no suitable elements were located on the page, then create new `<article>` element and inject it just before the main `<table>` element as its sibling.

<br>

### Optional and Custom HTML elements

As seen from above, the `smartable` framework requires at least 2 elements to be present on the page (or they would be auto-created). However, further elements are needed for things like filtering, displaying filter help and exporting. Those are optional, in a sense that nothing will break if the elements are absent, but they won't be auto-created by the framework and, thus, filtering and/or exporting won't be functional.

Below is the complete list of HTML elements that can be supplied during the framework initialisation to make it explicit which elements should be used for the features that control data filtering and exporting:

```js
smartable({
  html {
    helpHtml:    // can be set to custom HTML (usually not), contains filter syntax help HTML that is injected into the .help container defined below
    error:       // the HTML container that would contain the error text in case of the fatal data loading or initialisation error (block element)
    export:      // the element that will trigger the table data export into CSV when clicked (typically a button element)
    filterApply: // the element that will trigger data filtering with the current filter when clicked (typically a button)
    filterClear: // the element that will clear the current filter when clicked (typically a button)
    filterError: // the HTML element for holding the error text in case current filter is invalid (typically an inline block)
    filterHelp:  // the element that when clicked will trigger hiding and showing the .help element defined below (typically a button element)
    filterInput: // the element that will allow to enter filter text (typically an 'input' element of a 'text' type)
    help:        // the HTML container element that will hold the entire .helpHtml defined above (typically a block element)
    table:       // the main table, has to be a `table` element
  }
});
```

Beside the `.helpHtml` text which usually remains the same, all other HTML elements would have to be provided to `smartable` one way or another. The elements can be explicitly supplied inline when calling `smartable()` initialising routine. However, there is a possibility to let `smartable` "guess" all of the elements that are needed for filtering and exporting, if they are already present and formatted in a certain way in the initial HTML. If this is successfully done, no custom inline `.html` object during the initialisation would not be required at all.

Below is the template that will result in `smartable` detecting all necessary elements automatically. It mostly relies on certain `name` property values and other simple assumptions:

```html
<body>
  <header> <!-- header is not required, it is here only to make the entire structure "more logical" -->
    <div>  <!-- same as above, the div is not a must at all, just to create a more complex HTML structure -->
      <input type="search" /> <!-- the first 'input' element with type='search' becomes html.filterInput -->
      <button name="help">?</button>            <!-- a button with name="help" becomes html.filterHelp -->
      <button name="reset">Clear</button>       <!-- a button with name="reset" becomes html.filterClear -->
      <button name="submit">Filter</button>     <!-- a button with name="submit" becomes html.filterApply -->
      <output name="badfilter" hidden></output> <!-- an output with name="badfilter" becomes html.filterError -->
    </div>
    <div>
      <button name="export">Export</button>  <!-- a button with name="export" becomes html.export -->
    </div>
  </header>
  <output hidden><!-- initialisation errors will go here, so this becomes html.error --></output>
  <article hidden><!-- help text contained in html.helpHtml will go here, so this becomes html.help --></article>
  <table><!-- this is, obviously, going to become html.table -->
    <caption>
    </caption>
    <thead>
    </thead>
    <tbody>
    </tbody>
  </table>
</body>
```

<br>

### Default CSS Classes

When `smartable` builds the target table it also assigns various CSS class names to certain elements so that they can be styled with custom CSS code as the user sees fit. Those class names have predefined values that are listed below with the explanations to which elements they would be attached.

- `-smartable-error`\
This class is attached for the container element (the `<output>` element by default), that is responsible for displaying critical errors during data loading stages.
This class name (unlike all other names listed below) cannot be overridden with a custom value.\
This is because the error element could already be displayed before the `specs` with custom CSS class names are loaded from an external URL.

- `-smartable`, `-smartable-filterable`,`-smartable-sortable`\
Are attached to the `<table>` element itself, so that other CSS styling can use it as a [starting point](https://github.com/uncle-fed/smartable/blob/main/demo/example02/index.css#L21-L33) for the child nodes styling.\
The `...-filterable` and the `...-sortable` classes will get assigned only if the corresponding features of filtering and sorting were enabled in the table `specs`.

- `-smartable-sort-asc`, `-smartable-sort-desc`\
Are attached to the table headers, i.e. to the `<th>` elements when sorting is performed on a certain columns.\
This makes it possible to change how the table headers look if the sorting order is applied to a column, as shown [here](https://github.com/uncle-fed/smartable/blob/main/demo/example02/index.css#L35-L36).

- `-smartable-bad-value`\
Is attached to table cells, i.e. to the `<td>` elements where `smartable` has decided that the value is [bad](TYPES.md#bad-values-handling).\
Useful for highlighting cells with problematic values, see how it is done in the [example here](demo/example01/index.html).

- `-smartable-filter-input`, `-smartable-filter-apply`, `-smartable-filter-clear`, `-smartable-filter-error` `-smartable-filter-help`, `-smartable-help`\
These classes will be applied to the HTML elements that provide data filtering functionality.\
Namely, the filter text `<input>` element, the submit `<button>`, the clear filter `<button>`, the filter error `<output>` inline block, the `<button>` that triggers display of the filter help syntax explanation and the actual help block (that comes as `<article>` element if not custom-provided).

- `-smartable-export`\
This class will be applied to the HTML elements responsible for triggering data export (tyically a `<button>`).


The imaginary HTML below demonstrates the result of applying these CSS classes automatically:


```html
<body>
  <header>
    <div>
      <input type="search" class="-smartable-filter-input" />
      <button name="help" class="-smartable-filter-help">?</button>
      <button name="reset" class="-smartable-filter-clear">Clear</button>
      <button name="submit" class="-smartable-filter-apply">Filter</button>
      <output name="badfilter" class="-smartable-filter-error" hidden></output>
    </div>
    <div>
      <button name="export" class="-smartable-export">Export</button>
    </div>
  </header>
  <output class="-smartable-error" hidden></output>
  <article class="-smartable-help">
    <!-- the filter syntax help text that will be injected here by `smartable`
         can also be customised; see next section for more information about that -->
  </article>
  <table class="-smartable -smartable-filterable -smartable-sortable">  <!-- all three could be applied together -->
    <caption>
    </caption>
    <thead>
      <!-- one at a time for <th>, not both together -->
      <tr><th class="-smartable-sort-asc -smartable-sort-desc"></th><th></th></tr>
    </thead>
    <tbody>
      <tr><td></td><td class="-smartable-bad-value">???</td></tr>
    </tbody>
  </table>
</body>
```

<br>

### Custom CSS Classes

The default CSS class names that are assigned automatically by `smartable` to the key HTML elements ([described above](#default-css-classes)) can be changed, if different naming scheme is required. The section above that talks about the [Default Specs](#default-specs) list the `cssClass` property in the `specs`. It is, therefore, possible to supply custom names for any CSS class (except for the `-smartable-error`, as already described) via the table `specs` and its `cssClass` property. For instance:

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";

smartable({
  source: {
    myData: "./mySource.yml"
  },
  specs: "./mySpecs.yml",
  cssClass: {
    help: "myHelpCSSClass",
    smartable: "mySmartableCSSClass"
  }
});
```

In addition to the CSS classes assigned completely automatically, to the standard HTML elements, it is possible to make `smartable` assign further custom classes to table rows, columns or individual cells.

<br>

#### Table Columns

The custom CSS class(es) can be assigned to all cells of the same column by supplying their name(s) in the appropriate column definition, directly in the `specs / table`. For example, if the specs YAML file contained the following part:

```yml
table:
  - first_name:
      header: First Name
      cssClass: fname
  - last_name:
      header: Last Name
      cssClass:
        - lname
        - centered
```

The resulting HTML would be similar to the following:

```html
...
  <thead>
    <tr><th class="fname">First Name</th><th class="lname centered">Last name</th></tr>
  </thead>
  <tbody>
    <tr><td class="fname">...</td><td class="lname centered">...</td></tr>
    ...
  </tbody>
...
```

It follows from above, that one or more custom CSS classes can be specified per column definition as a string or as a list/array.

For a live example, see how it is done in the [example01](https://github.com/uncle-fed/smartable/blob/main/demo/example01/index.html#L58) for the column with the id `email` that uses the `cssClass: "special"`

<br>

#### Table Rows

The individual table rows can also get custom CSS classes assigned to the entire row by attaching the desired class name to the `<tr>` element. However, since the rows have no definition in the `specs` and there can be an arbitrary number of rows in the table, the only way to assign extra classes to rows would be via the `converter` function or by directly manipulating the table `.data` property in a callback such as `initData(...)` (which is pretty much the same, in essence).

As per the explanation in the [Data Converter](#data-converter-and-custom-data-sources) section, the table data that has been loaded, converted and normalised finally resides in a `.data` structure that is a JavaScript array, where every array item represents a table row. Every table row is a JavaScript object with the properties that match column IDs. For example, the following object represents single row with 2 columns (`id` and `first_name`):

```js
{
    "id": {
        "value": 5,
        "type": "Number",
        "cssClass": [],
        "html": "5",
        "cmp": 5,
        "match": "5"
    },
    "first_name": {
        "value": "John",
        "type": "String",
        "cssClass": [
          "special"
        ],
        "html": "John",
        "cmp": "JOHN",
        "match": "JOHN"
    },
    "_row": {
        "cssClass": [
          "centered"
        ]
    }
}
```

Notice, however, that there is a third object property named `_row` that represents this particular row's metadata. The `cssClass` property of the row is where the custom CSS classes could be assigned, either during the `converter` function run or a bit later in a `dataInit(...)` callback. It would not be possible to change the effective class list later, because the `smartable` caches the generated HTML (including custom classes). For instance, by the time the `initRender(...)` callback runs, it is already "too late" as the rows HTML would have been generated and cached by then.

See how the `_row.cssClass` property is used in the `initData(...)` callback to highlight the rows where the date in one of the cells is "outdated" in the [example here](https://github.com/uncle-fed/smartable/blob/main/demo/example03/main.mjs#L43-L45).

<br>

#### Table Cells

Everything that is described above regarding the [custom CSS styles for table rows](#table-rows) can be said about applying custom CSS styles to individual cells. The only difference would be that the `cssClass` should be applied to an individual cell (a property with a particular column id), instead of the `_row` ID. In the above example, there is a custom CSS style called `"special"` that is applied to the cell with the ID `first_name`.

See how the `updated.cssClass` property is used in the `initData(...)` callback to highlight the rows where the date in the `updated` column is "outdated" in the [example here](https://github.com/uncle-fed/smartable/blob/main/demo/example02/main.mjs#L13-L15).

<br>
<br>

## Callbacks and Triggers

The `smartable` framework allows extending the behaviour that surrounds the main table with custom events and interactive elements known as `callbacks`. For instance, it is possible to supply any arbitrary / custom JS code (a *callback*) that would get executed automatically when certain action or event happens in the table. The other way around, it is also possible to *trigger* a view or column group visibility change in the table as a result of some event on the page HTML (typically caused by user interaction).

The callback function(s) can be defined by the user and supplied to `smartable` during its initialisation.\
For example, the following user function will get called every time the table is finished (re)rendering (because it was sorted by a column or rows were filtered):

```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";

smartable({
  source: {
    myData: "./mySource.yml"
  },
  callback: {
    postRender: customPostRender
  }
});

function customPostRender(tbl) {
  console.log(tbl.render.rowsCount);
}

```

The events that make `smartable` trigger certain callback functions are listed below together with their names.\
The callbacks that have `init...` in their names are called once only, one the initial page load and never again.\
Other callbacks can be triggered by `smartable` multiple times during the lifetime of the table.

<br>

### Predefined Callbacks

```js
callback: {

  initData: ...    // called once only per table initialisation, when all source data has been normalised but not yet rendered
  initRender: ...  // called once only per table initialisation, when the table has been fully rendered the very first time

  preRender: ...   // called every time the table is about to be redrawn
  applyView: ...   // called every time the current view or column group might be changing, allowing other custom elements to react on this
  applyState: ...  // called every time the current filtering / sorting state is applied to the data rows, allows to apply custom state
  postRender: ...  // called every time the table has been redrawn, allows to update other custom elements on the page

  preFilter: ...   // called every time when Filter button is pressed but before actual data filtering routines start
  postFilter: ...  // called every time the filtering has finished
  clearFilter: ... // called every time the filter field is cleared completely and rows filtering is reset

  preSort: ...     // called every time sorting operation on the column is about to commence
  postSort: ...    // called every time sorting operation has finished
}
```

<br>

### The Callback Argument

When any of the `callback` functions above are triggered by the `smartable` framework, they will be called with a single argument.\
The argument is the same for every callback and it is the "global" table object that represents the entire `smartable instance`.\
This means providing access to all of the table source data, actual rows, specs, current state, current render parameters, etc.\
The callback function can take advantage of the object and build its own behaviour accordingly or even mutate some of the properties.

The complete callback argument Object is as follows:

```js
{
  callback: {}, // the object which holds the definitions of all known callback functions (if those were defined)
  converter: f, // the data converter function (the default built-in or custom function defined during initialisation)
  cssClass: {}, // the object which holds the definitions of all CSS Class names used by the instance (default + user defined)
  data: [],     // the array that holds the normalized data rows, where each row is an Object describing cells of that row
  display: [],  // the array that provides the sorting order for the rows from data[] above, and tells which rows to show/hide due to filtering
  html: {},     // the object that contains references to the DOM nodes of all of the key HTML elements (table, thead, tbody, filtering buttons, help, etc.)
  options: {},  // the object that gets populated with the options from the 'specs' file (as described above in the section about 'specs')
  render: {},   // the object that contains information about the current rendering parameters (see below)
  source: {},   // the object that is provided during the table initialisation by the user, contains the URL(s) to the source data
  specs: "",    // the name of the 'specs' file (if any) supplied by the user during the table initialisation
  state: {},    // the 'state' object that is also reflected in page URL (contains current filter, sorting column, current view and column group(s))
  table: Map(), // the definition of the table columns (typically supplied in the 'specs' file) with the data types, header names, column groups, etc.
  trigger: {},  // the object which holds the definition of all predefined triggers (currently there is just one, called `updateView()`)
  views: {},    // the definitions of the the table views (if any) that look like partial (in terms of columns) 'table' definitions
  DateTime: {}  // the instance of Luxon object (if auto-loaded) that allows using Luxon date/time manipulation library in custom callbacks
};
```

Of all the Object keys above that are already mentioned in other sections of this document, perhaps one deserves further explanation.\
The `.render` key is the reference to how the current table is being rendered at the moment.\
It contains the following:

```js
smartable.render {
  "trigger": "...",     // what triggered the table (re)rendering: "init", "sort", "filter", "view", "partialNavigation", "navigation"
  "view": Map(),        // rendered columns specs (if no views/colgrp are in use, it will be a copy of 'table' definition from 'specs')
  "rowsCount": 25,      // the number of rendered rows (can be less than total rows due to filtering)
  "sortColIdx": 0,      // zero-based index of the column that sorting order was applied to (unset if no sorting was ever done)
  "sortColKey": "...",  // the column id (string) of the column that sorting order was applied to (unset if no sorting was ever done)
  "sortOrder": "asc"    // the sorting order: "asc" or "desc"
}
```

A note about the `DateTime` property of the callback argument: if custom date formatting was configured in the specs, the `smartable` will automatically load and use the [Luxon library](https://moment.github.io/luxon/api-docs/index.html). In this case the callback argument will contain a property called `DateTime` which is essentially a ready to use instance of the Luxon library. This makes it possible to employ Luxon in a custom callback code that may need it to manipulate JS dates, without the need to load it separately.

<br>

### Predefined Triggers

In addition to the `callback` functionality described above (where `smartable` allows to execute custom user code), sometimes it is required to do the reverse. That is, a user may want to trigger some `smartable` code on demand. The most often use case is table redraw due to the change of the current table `view` or the current `column group` that was caused by user actions.

`smartable` has currently a single `trigger` function that can be called by the user for this purpose called `updateView(...)`. The function should be called with a single argument, which has to be an object with at least one of the following properties set:

```js
mySmartableInstance.trigger.updateView({
  view: "view-name",             // a string that is the view name, as defined in the 'specs' / 'views'
  colgrp: ["col-name", ... ]     // array of column groups to be displayed, as defined in the 'specs' / 'table' / colGroup
});
```

One important aspect of this is the `mySmartableInstance.` object in the example above. The `updateView(...)` function is not available on its own in the global JS context, so it cannot be called as `window.updateView(...)` or `document.updateView(...)`, etc. It can only be called as a method of the existing (already initialised `smartable` instance). And the only way to access `smartable` instance is to use one of the `callback` functions [defined above](#predefined-callbacks), because, as explained, each `callback` function gets the `smartable instance` as its argument, thus, giving access to the `updateView(...)` trigger function.

The `updateView(...)` trigger(s) should normally be attached only once per table lifetime, so it would make sense to do that inside a callback that also gets executed only once. This narrows down the choice of the callbacks to two, i.e., either the `initData(...)` or the `initRender(...)` that are fired only once per table lifetime.

It is best illustrated by the example below where the custom `initRender(...)` callback will be called once only. The `mySmartableInstance` will be available as the argument to the callback, and, therefore, it is possible to attach the `updateView(...)` trigger function to this particular instance. It then can be triggered by some HTML buttons (where each button's `value` should contain the desired `view` name, in this imaginary example). The fully working examples of the `updateView(...)` can be also seen [here](demo/example02/index.html) and [here](demo/example03/index.html).


```js
import smartable from "https://cdn.jsdelivr.net/gh/uncle-fed/smartable@1/src/smartable.min.mjs";

// assumes that the current view can be changed via several custom HTML buttons of this kind:
//    <button value="my-view-name" class="vs">

smartable({
  callback: {initRender}
});

function initRender(mySmartableInstance) {              // this is called once only(!), just before the table init is over
  document.querySelectorAll(".vs").forEach(button => {  // get all the <buttons> and loop trough their list
    button.addEventListener("click", (event) => {       // assign a handler for a 'click' event on each <button>
      mySmartableInstance.trigger.updateView({          // the 'click' handler should call the .updateView() smartable trigger
        view: event.target.value                        // the view id from the <button> 'value' gets passed to the trigger
      });
    });
  });
}
```
