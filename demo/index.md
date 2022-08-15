## Documentation

The formal documentation can be found [here](../USAGE.md)

## Examples

The examples provided in this repository illustrate typical `smartable` usage.

- [Example 00](https://uncle-fed.github.io/smartable/demo/example00/index.html)\
An absolute bare minimum *smartable* application that needs no custom JavaScript code to be supplied (since the source data is already in the expected format).

- [Example 01](https://uncle-fed.github.io/smartable/demo/example01/index.html)\
Similar to the previous example (no need for a custom data converter), but showcases that the *specs* can be supplied *inline* (without external YAML file). Also enables filtering and sorting on the table and shows how custom (static) cell and column highlighting can be employed with CSS.

- [Example 02](https://uncle-fed.github.io/smartable/demo/example02/index.html)\
A more advanced example that enables all the `smartable` features, like filtering, sorting, exporting as well as the advanced option of *column groups* that are controlled by the custom HTML checkboxes. Showcases how *smartable* callbacks and triggers are used to give the table interactive behaviour. Continues with highlighting based on column groups CSS styles. Also shows how dynamic highlighting can be used for single cells, based on the value in the cell (the dates before 2019-11-01 are highlighted).

- [Example 03](https://uncle-fed.github.io/smartable/demo/example03/index.html)\
Further advances the usage of the framework by showcasing the *views* feature and the related *trigger* that redraws the table when the current view is switched. Views definitions are provided in the `specs` file and the view switching is done by the HTML buttons (with a custom click event handler attached via the JavaScript code). Dynamic row highlighting is also shown (depending on the 'last updated' date stamp that is before "2019-11-01"). Also, the source data now comes from two different YAML files and needs to be *pre-processed* with a custom converter function before the table can be built. Finally, the custom callback shows how to dynamically update the number of rows currently shown on the page (the number will dynamically change if filtering or certain partial data views are used).
