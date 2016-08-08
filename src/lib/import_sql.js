/**
 * Created by jun.li on 2016/5/23.
 */
'use strict';
var exec = require('child_process').exec;

function ExecShell(cmd, callback) {
    exec(cmd, function (e, stdout, stderr) {
        //if(e)
    })
}