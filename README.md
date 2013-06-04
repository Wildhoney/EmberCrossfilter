EmberCrossfilter
================

Instead of using Ember DataStore, EmberCrossfilter provides a basic architecture for creating Ember models with Crossfilter. Simply include the EmberCrossfilter mixin in your controller, and you're all ready to go!

Why choose Crossfilter?
-------------

Crossfilter uses JavaScript's typed arrays to allow for much quicker sorting and filtering. It is proven to be numerous times faster than native JavaScript filtering methods; therefore when large amounts of data is involved, Crossfilter is provides a much better user experience.


What is EmberCrossfilter?
-------------

I've created EmberCrossfilter to allow a simple configuration to drive the automatic creation of Crossfilter dimensions, and two methods for applying and clearing filters.

EmberCrossfilter supports *all* Crossfilter filtering methods, and even implements one that I believe is missing: being able to filter using jQuery's `inArray`.

When using Crossfilter, a common mistake is to replace the `content` property with `crossfilter(content)`, however, with EmberCrossfilter we only update the `content` with plain old JavaScript arrays, which allows for much easier debugging.


How do I use it?
-------------

EmberCrossfilter can be configured with one configuration object (`filterMap`).

In the bundled example we have the following configuration:

	filterMap: {
		colour: { property: 'colours', dimension: 'colour',  method: 'filterInArray', value: null },
		minAge: { property: 'age', dimension: 'age', method: 'filterRangeMin', value: null },
		maxAge: { property: 'age', dimension: 'age', method: 'filterRangeMax', value: null },
		name:   { property: 'name', dimension: 'name', method: 'filterExact', value: null  },
		isCute: { property: 'cuteness', dimension: 'cuteness', method: 'filterFunction', value: null }
	}
	
This `filterMap` creates a total of 4 dimensions (`colour`, `age`, and `name`):

<table>
    <tr>
        <td>Dimension name</td>
        <td>Model property</td>
        <td>Crossfilter method</td>
    </tr>
    <tr>
	<td><code>minAge</code></td>
	<td><code>age</code></td>
	<td><code>filterRange</code></td>
    </tr>
    <tr>
	<td><code>maxAge</code></td>
	<td><code>age</code></td>
	<td><code>filterRange</code></td>
    </tr>
    <tr>
	<td><code>name</code></td>
	<td><code>name</code></td>
	<td><code>filterExact</code></td>
    </tr>
    <tr>
	<td><code>colours`</td>
	<td><code>colour`</td>
	<td><code>filterInArray`</td>
    </tr>
    <tr>
	<td><code>name</code></td>
	<td><code>name</code></td>
	<td><code>filterExact</code></td>
    </tr>
</table>


For the `filterRange` we must specify the array as two entries, we can then update each one independent of the other as we would with other dimension types.

For example, I could set the `minAge` with the following: `addFilter('minAge', 5);` I can also set the maxAge on its own: `addFilter('maxAge', 5);` the only caveat is that the convention is to specify both sides of the `filterRange`, so we'd need to specify: `minNumberOfX`/`maxNumberOfX`, always using the `min`/`max` prefix.