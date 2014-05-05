module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: ['packages/ember-crossfilter/ember-crossfilter.js'],
            options: {
                jshintrc: '.jshintrc'
            }
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
                options: {
                    paths: 'packages/ember-crossfilter/',
                    outdir: 'docs/'
                }
            }
        },
        jasmine: {
            pivotal: {
                src: 'packages/ember-crossfilter/ember-crossfilter.js',
                options: {
                    specs: 'tests/spec.js',
                    helpers: ['example/js/vendor/jquery/jquery.js',
                              'example/js/vendor/handlebars/handlebars.js',
                              'example/js/vendor/ember/ember.js',
                              'example/js/vendor/crossfilter/crossfilter.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('test', ['jshint', 'jasmine']);
    grunt.registerTask('build', ['uglify']);
    grunt.registerTask('default', ['jshint', 'jasmine', 'uglify']);

};