/**
 * Created by jun.li on 2016/5/23.
 */
//'use strict';
var _exec = require('child_process').exec;
var file_name = 'D:/Documents/svn/srpg/doc/游戏/DNK/版本管理/数值表同步/1/design.sql';
var cmd = "mysql -h10.10.10.119 -P2433 -uhtdba -phtdba test < " + file_name;
_exec(cmd, function (err, stdout, stderr) {
    console.log(err);
    console.log(stdout);
    console.log(stderr);
});