## `Smartable` Data Types

### Table of Contents

- [Supported Data Types](#supported-data-types)
- [Internal Representation of a Value](#internal-representation-of-a-value)
- [Automated Parsing of the Initial Values](#automated-parsing-of-the-initial-values)
- [Expected Formatting for Special Data Types](#expected-formatting-for-special-data-types)
- [Internal Representations for Certain Data Types](#internal-representations-for-certain-data-types)
- [Bad Values Handling](#bad-values-handling)

<br>

### Supported Data Types

The data types that can be declared in the table definition are the following:

- `str` String (any arbitrary text strings)
- `num` Numeric (integers, decimals, negative/positive)
- `range` Ranges of positive integers, i.e., two numbers with a dash between (for example, all numbers from 42 to 91: `42 - 91`)
- `ip` IP addresses or Subnets (IPv4 only with optional netmask, for example: `10.0.0.2` or `172.19.28.254/24`)
- `date` Date - a text string that represents a date with optional time (multiple formats are supported, see below)
- `ver` Version - a text string that denotes a version number of any complexity (for example: `1.0.3` or `4.7.2-build123`)

If no data type is specified for a column, it is assumed to be of a `str` type.

<br>

### Internal Representation of a Value

With the exception of the `num` (and some forms of the `date`) all other types are essentially strings.\
The difference is largely in how the values would be compared to each other when doing sorting or filtering operations.\
It is, therefore, important to make sure the column definition contains the right data type, if the operations of filtering and sorting are expected to perform correctly.

Since JavaScript does not have native means of comparing "integer ranges" or "IP addresses" or "version strings", the `smartable` framework attempts to solve this by creating several different internal representations of the initially supplied value (during the initial data loading). Later, depending on the operation being performed (sorting, filtering, regex matching, etc), the appropriate representation of the initial value will be picked for a particular operation to make sure the results are as expected.

Below are all of the possible *representations* of the initial value and a brief description of why they could be needed:

- `.value`   *the original value as is* &ndash; it will be used to obtain the other representations below and is a *MUST* to supply
- `.html`    *what should be displayed in the table cell* &ndash; may look like the actual value or may be totally different
- `.match`   *case insensitive string representation* &ndash; needed for the `=`, `!=`, `~`, `!~` operators, when doing row filtering
- `.cmp`     *numeric value or hashed/normalised string* &ndash; for `<`, `>` comparison (filtering and row sorting)
- `.cmpMin`  *min integer* &ndash; used for `<` comparison on `range` and `ip` data types only (filtering and sorting)
- `.cmpMax`  *max integer* &ndash; used for `>` comparison on `range` and `ip` data types only (filtering and sorting)
- `.mask`    *integer netmask representation* &ndash; for `ip` data type and `@=` special comparison operator only (filtering)

It is not expected that all (or any) of these representations should be supplied together with the initial (raw) value, since most of them can be automatically derived from the initial value (unless special/unique representation should take place and it cannot be automatically obtained by the ordinary logic).

The `smartable` code takes care about creating those representations for a given cell (normally, once only during the initial *data normalisation* step). However, if needed any of those representations can be explicitly provided as a part of the initial data load (in the `converter` function). The supplied representations will be used directly without trying to obtain them automatically. This is quite often the case for the `.html` representation, where the original raw value could be quite different from what should be displayed in the table (it could end up being an HTML link containing the original value or even an image based on the original value, etc.) but the raw value would still be used for row sorting and filtering.

<br>

### Automated Parsing of the Initial Values

In certain cases the conversion to various representations relies on how the initial value really is really formatted.\
This is especially important when certain data type can take various known forms (such as the `date` or `range` or `ip`).\
The following principles will be used by the automated conversion routines:

1. The column data type (defined in `specs` as a `table` definition) will always be considered as the basis for all conversion logic.
2. Non-trivial data types (i.e., not `num` and not `str`) must have their initial value formatted in one of the ways that `smartable` understands (see below).
3. Any of the representation(s) (like `.cmp` or `.match`, etc.) can be user-supplied but they must correspond to the implicit requirements imposed by the chosen data type.
4. If the supplied representation does not fit the type requirements (for example `.cmpMin` for a `str`), it'll be ignored.
5. if the supplied value type or its expected formatting does not match the defined type, and the automated conversion is impossible, the representations will be set to a special `bad` value ([see below](#bad-values-handling)).

<br>

### Expected Formatting for Special Data Types

- `range`\
Either a single integer or a string with two positive integers separated by non-numeric characters.\
any other characters (anything before the first integer and all characters after the second integer) will be discarded.

- `date`\
The initial value can be supplied in 3 different formats:
  - As an ISO 8601 formatted date string or any other string that is correctly understood by the JavaScript's [`Date.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#date_time_string_format) method.
  - As an actual JavaScript Date object.\
    Note: there is no need to convert human readable date strings into JS objects as long as they are correctly understood by `Date.parse()`. This possibility is there only for those cases when the source data is already a native JS Date object or when the date / time stamps require additional processing before `Date.parse()` is able to recognize them.
  - As a positive integer, representing milliseconds since January 1, 1970, 00:00:00 UTC.\
    Similarly to the note above, it is not a must to convert the date string into this format, unless it is already a Unix time stamp or the initial value needs special processing beyond the standard `Date.parse()` method.

- `ip`\
Only IPv4 addressing is supported.\
The valid IP address value should be a string containing the IP address in a form `int.int.int.int` followed by optional netmask specification, either in the `int.int.int.int` or `/int` format. If the netmask is omitted or badly formatted, it will be automatically assumed to be `/32` (i.e., a single host), all the characters before the first `int.` value and after the netmask value will be ignored.

- `ver`\
Usually can be any arbitrary string but typically it is expected that the version has formatting similar to `x.x.x-blah-x`.\
A hashing function will be applied to version strings to obtain a special 'normalised' representation that allows versions to be compared correctly.

<br>

### Internal Representations for Certain Data Types

- The `str` and `num` data types are nothing special when it comes to automatically determine their possible `.cmp` and `.match` representations. The `.match` is always going to be an uppercase characters only version of the original value, in order to allow (faster) case-insensitive comparison operations.

- The `range` data type is straightforward, its only specialty that it does not use the `.cmp` representation, but rather `.cmpMin` and `.cmpMax` matching the lowest and highest value in the range. Those two representations will be used for comparison sorting instead of the the simple `.cmp` value.

- The `ip` data type is very similar to the `range` data type in a sense that, since the value can represent either a single IP or a subnet, it essentially also represents a range (of IPs). The IP addresses are converted to integers, similar to how the [`inet_aton()`](https://linux.die.net/man/3/inet_aton) C function does it, which generates the `.cmpMin` representation, and the optional netmask part of the IP address will produce the upper possible IP range value, i.e. `.cmpMax`. In the end, the subnet becomes (internally) a range of integers and, thus, functions very similar to the `range` data type when it comes to comparison or sorting. The only extra feature of the `ip` data type (vs the `range` data type) is that the `ip` data type gains a special filtering operator `@=` that can be used to determine if certain IP address lies within a subnet. For example, the filter like `my_ip_column @= 192.168.1.0/24` will filter all the rows where the value in the `my_ip_column` belongs to the subnet `192.168.1.0/24`.

- The `date` data type generates its `.cmp` representation as a simple integer that matches the original date's Unix time (in milliseconds). It then behaves largely as a `num` data type when it comes to sorting and comparison operators. The `date` is the only data type that is able to automatically apply custom date/time formatting for its `.html` representation. The custom formatting can be supplied in the `specs` via the `dateFormat` property (as a table global or column specific), additionally custom formatting can be set on a per-cell basis (when the data is loaded and converted with a custom `converter` function). The column definition overrides table global `dateFormat` setting and the cell `dateFormat` will override all other formatting. The `smartable` framework uses the 3rd party [Luxon library](https://moment.github.io/luxon/#/formatting?id=table-of-tokens) for its custom date formatting.

  *A tip for using the Luxon Date/Time library in the custom JavaScript code*: every `callback` that `smartable` fires, has a single argument as [explained here](USAGE.md#the-callback-argument). This argument is an object that will also have a property called `DateTime` if the Luxon library has been loaded and used internally. So it is possible to use Luxon in any custom callback code that may need it to manipulate JS dates, without the need to load it separately.

- The `ver` data type uses a special hashed version of the original value for its internal `.cmp` representation. A typical version string is expected to be something like `x.x.x-blah-x`. A single `x` can be alphanumeric of any length but it will be truncated or padded to 6 chars in the hashed version. The `blah` part is optional (something like `release`, `rc`, `beta`, etc.) and will be truncated to 2 characters. The digit and the dash after the `blah` is also optional and will be truncated to 6 chars. Padding characters will be either `space` (shown as `·` below) or `~` (to maintain correct sorting order when hashes would be compared to each other). For example:

```
"1.2.?.9876543.omg.9-bUiLd-7"  becomes  "·····1·····2·····?987654···omg·····9bu·····7"
"1.13.7"                       becomes  "·····1····13·····7··················~~······"
"1.13.7-rc12"                  becomes  "·····1····13·····7··················rc····12"
"1.131.7-a-z3"                 becomes  "·····1···131·····7··················a~····z3"
```

<br>

### Bad Values Handling

When the supplied data does not match the defined type, it needs to be handled in a special way.\
First, a check is being made if the automated conversion could be possible (typically for some `num` or `str` values).\
When the auto-handling is impossible and/or the actual value is something like `undefined`, `NaN`, `null` or is a JS `Object` or `Array`, two decisions will have to be taken:

- what to show in the table cell (i.e., what should the value's `.html` representation be)
- what should the internal representation of such *bad* value be (that will be affecting its sorting order)

With regards to the `.html` representation of the *bad* value, the following logic will be used:

- If the data is a *String* but it does not meet the type expectations, the actual String value will be retained and displayed in the table.
- Otherwise, the `.htmlAlt` value will be used (if defined for a cell, for a column or for the entire table globally, in this order).
- Otherwise, the string that indicates the *bad value type* will be used (for instance, `null` value will become a string that spells: `"Null"`, the JS `Array[]` becomes a string that spells: `"Array"`, etc.)

In addition, to the above, a special CSS class name will be automatically applied to each cell containing a *bad value*.\
The class name can be defined as `cssClass.badValue` in the `specs`, however, if omitted the default value of `-smartable-bad-value` will be applied.

Every time the `.html` representation is assigned a value that differs from the original value (because the original value ended up being *bad*), the `.match` representation will also be automatically adjusted. This would be done to allow filtering and string matching to function correctly and actually match the *bad value* itself. Keep this in mind, if the `.html` representation is generated to be a custom value - it will be overridden by the `smartable` for a particular cell, if the cell value is determined to be *bad*.

With regards to the `.cmp*`/`.mask` representations of the "bad" value, the following rules will apply:

- for the `str` and `ver` data types, the `.cmp` value will be set to an empty string.
- for the `num` and `range` data type, the `.cmp*` value(s) will be set to `Number.NEGATIVE_INFINITY`.
- for the `ip` data types, the `.cmp` and `.mask` values will be set to an equivalent of `0.0.0.0 /0`
- for the `date`, the `.cmp` value will be an equivalent of Unix time with the value of `0` (meaning `January 1, 1970, 00:00:00 UTC`).
