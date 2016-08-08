/**
 * Created by jun.li on 2016/5/23.
 */
'use strict';
var _readline = require('linebyline');
var _file = require('fs');


function ReplaceSqlNull() {
    var lines = [];
    _readline('E:/temp/db_game_design.sql').on('line', function (line, lineCount, byteCount) {
        if (line.indexOf('int(') > -1) {
            if (line.indexOf('COMMENT') > -1) {
            var temp = line.match(/char\(.{1,4}\)/);
                line = line.replace(/int\(.+COMMENT/, "int NOT NULL DEFAULT 0 COMMENT");
            } else {
                line = line.replace(/int\(.+\,/, "int NOT NULL DEFAULT 0 ,");
            }
        } else if (line.indexOf('char(') > -1) {
            var temp = line.match(/char\(.{1,4}\)/);
            if (line.indexOf('COMMENT') > -1) {
                line = line.replace(/char\(.+COMMENT/, temp + " CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' COMMENT");
            } else {
                line = line.replace(/char\(.+\,/, temp + " CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' ,");
            }
        } else if (line.indexOf('datetime ') > -1) {
            if (line.indexOf('COMMENT') > -1) {
                line = line.replace(/datetime.+COMMENT/, "datetime NOT NULL DEFAULT '2000-01-01 00:00:00' COMMENT");
            } else {
                line = line.replace(/datetime.+\,/, "datetime NOT NULL DEFAULT '2000-01-01 00:00:00' ,");
            }
        } else if (line.indexOf('date ') > -1) {
            if (line.indexOf('COMMENT') > -1) {
                line = line.replace(/date.+COMMENT/, "date NOT NULL DEFAULT '2000-01-01 00:00:00' COMMENT");
            } else {
                line = line.replace(/date.+\,/, "date NOT NULL DEFAULT '2000-01-01 00:00:00' ,");
            }
        }
        lines.push(line);
    }).on('end', function () {
        callback();
    }).on('error', function (e) {
        console.error(e);
        callback();
    });

    function callback() {
        _file.writeFileSync('E:/temp/db_game_design.sql_new.sql', lines.join('\n'));
    }
}

ReplaceSqlNull();

module.exports = ReplaceSqlNull;