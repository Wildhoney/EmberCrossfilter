module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: ['packages/ember-crossfilter/ember-crossfilter.js']
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> by <%= pkg.author %> created on <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'packages/ember-crossfilter/ember-crossfilter.js',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        yuidoc: {
            compile: {
                name: '<%= pkg.name %>',
//                description: '<%= pkg.description %>',
//                version: '<%= pkg.version %>',
//                url: '<%= pkg.homepage %>',
                options: {
                    paths: 'packages/ember-crossfilter/',
                    outdir: 'docs/'
                }
            }
        }

    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-yuidoc');

    // Default task(s).
    grunt.registerTask('default', ['uglify']);

};