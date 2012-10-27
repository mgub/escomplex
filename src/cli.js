/*globals require, process */

(function () {
    'use strict';

    var reports = [],

    cli = require('commander'),
    fs = require('fs'),
    cr = require('./complexityReport'),
    check = require('check-types'),
    formatter,

    state = {
        reading: true,
        unread: 0,
        tooComplex: false
    };

    parseCommandLine();
    readSourceFiles();

    function parseCommandLine () {
        cli.
            usage('[options] <file...>').
            option(
                '-o, --output <file>',
                'specify an output file for the report'
            ).
            option(
                '-f, --format <format>',
                'specify the output format of the report'
            ).
            //option(
            //    '-lo, --logicalor',
            //    'disable complexity reporting of operator ||'
            //).
            //option(
            //    '-t, --ternary',
            //    'disable complexity reporting of operator ?:'
            //).
            //option(
            //    '-sc, --switchcase',
            //    'disable complexity reporting of switch statements'
            //).
            //option(
            //    '-fi, --forin',
            //    'enable complexity reporting of for...in statements'
            //).
            //option(
            //    '-tc, --trycatch',
            //    'enable complexity reporting of catch clauses'
            //).
            option(
                '-th, --threshold <complexity>',
                'specifify the per-function complexity threshold',
                function (value) {
                    return parseInt(value, 10);
                }
            );

        cli.parse(process.argv);

        if (check.isUnemptyString(cli.format) === false) {
            cli.format = 'plain';
        }

        formatter = require('./formats/' + cli.format);
    }

    function readSourceFiles () {
        var i;

        for (i = 0; i < cli.args.length; i += 1) {
            state.unread += 1;
            readSourceFile(cli.args[i]);
        }

        state.reading = false;
    }

    function readSourceFile (path) {
        fs.readFile(path, 'utf8', function (err, source) {
            if (err) {
                error('readSourceFile', err);
            }

            getReport(path, source);

            finish();
        });
    }

    function error (functionName, err) {
        fail('Fatal error [' + functionName + ']: ' + err.message);
    }

    function fail (message) {
        console.log(message);
        process.exit(1);
    }

    function getReport (path, source) {
        var report = cr.run(source);

        if (
            state.tooComplex === false &&
            check.isNumber(cli.threshold) &&
            isTooComplex(report)
        ) {
            state.tooComplex = true;
        }

        report.module = path;

        reports.push(report);
    }

    function isTooComplex (report) {
        var i;

        for (i = 0; i < report.functions.length; i += 1) {
            if (report.functions[i].complexity.cyclomatic > cli.threshold) {
                return true;
            }
        }

        return false;
    }

    function finish () {
        state.unread -= 1;

        if (state.reading === false && state.unread === 0) {
            writeReport();
        }
    }

    function writeReport () {
        var formatted = formatter.format(reports);

        if (check.isUnemptyString(cli.output)) {
            fs.writeFile(cli.output, formatted, 'utf8', function (err) {
                if (err) {
                    error('writeReport', err);
                }
            });
        } else {
            console.log(formatted);
        }

        exit();
    }

    function exit () {
        // TODO: Use Q

        if (state.tooComplex) {
            fail('Warning: Complexity threshold breached!');
        }
    }
}());
