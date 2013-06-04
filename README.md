EmberCrossfilter
================

Instead of using Ember DataStore, EmberCrossfilter provides a basic architecture for creating Ember models with Crossfilter. Simply include the EmberCrossfilter mixin in your controller, and you're all ready to go!

Why choose Crossfilter?
-------------

Crossfilter uses JavaScript's typed arrays to allow for much quicker sorting and filtering. It is proven to be numerous times faster than native JavaScript filtering methods; therefore when large amounts of data are involved, Crossfilter is provides a much better user experience.* It allows you to create up to 32 dimensions


Then what is EmberCrossfilter?
-------------

I've created EmberCrossfilter to allow a simple configuration to drive the automatic creation of Crossfilter dimensions, and two methods for applying and clearing filters.

EmberCrossfilter supports *all* Crossfilter filtering methods, and even implements one that I believe is missing: being able to filter using jQuery's `inArray`.

When using Crossfilter, a common mistake is to replace the `content` property with `crossfilter(content)`, however, with EmberCrossfilter we only update the `content` with plain old JavaScript arrays, which allows for much easier debugging.


How do I use it?
-------------

EmberCrossfilter can be configuring with one configuration object (`filterMap`). In the bundled example we have the following configuration:

	filterMap: {
		colour:   { property: 'colours', dimension: 'colour',  method: 'filterInArray', value: null },
		age:      { property: 'age', dimension: 'age', method: 'filterRange', value: [] },
		name:     { property: 'name', dimension: 'name', method: 'filterExact', value: null  }
	}
	
This `filterMap` creates a total of 3 dimensions (`colour`, `age`, and `name`):

<table>
    <tr>
        <td>Dimension name</td>
        <td>Model property</td>
        <td>Crossfilter method</td>
    </tr>
    <tr>
	<td>`colours`</td>
	<td>`colour`</td>
	<td>`filterInArray`</td>
    </tr>
    <tr>
	<td>`age`</td>
	<td>`age`</td>
	<td>`filterRange`</td>
    </tr>
    <tr>
	<td>`name`</td>
	<td>`name`</td>
	<td>`filterExact`</td>
    </tr>
</table>