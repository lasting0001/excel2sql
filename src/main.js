/**
 * Created by jun.li on 2016/5/23.
 */
'use strict';
var _file = require('fs');
var transfer = require('./lib/transfer');
var _exec = require('child_process').exec;
var config = JSON.parse(_file.readFileSync('../config.json'));
var path = config.path + '/';
//path = 'E:/temp/';

var xlsxs = [];
var files = _file.readdirSync(path);
files.forEach(function (fName) {
    if (fName.indexOf('.') === -1) {
        return;
    }
    if (fName.split('.')[1] !== 'xls' && fName.split('.')[1] !== 'xlsx') {
        return;
    }
    xlsxs.push(fName);
});
var resultRows = [];
resultRows.push('  ======excel转sql工具 by Jun.li========== \n');
//resultRows.push('  使用说明：  ');
//resultRows.push('  1、打开Navicate选中design库，双击  ');
//resultRows.push('  2、右键，运行sql文件,  ');
//resultRows.push('  3、选中目录下design.sql  ');
//resultRows.push('  4、点击开始，注意观察是否有报错 \n');
resultRows.push('  注意事项：  ');
resultRows.push('  1、时间类型值，如果小于2000年，则会加100年 ');
resultRows.push('  2、如果存在null，将会置为各类型默认值 ');
resultRows.push('  3、如果存在非法值，将会置为各类型默认值 ');
resultRows.push('  4、数据库中不存在某表时，将会忽略 ');
resultRows.push('  4、数据库中不存在某字段时，将会忽略 ');
resultRows.push('  5、各类型默认值： ');
resultRows.push('     int：0，char：空字符串');
resultRows.push('     时间类型：2000-01-01 00:00:00\n');
resultRows.push('  感谢使用，有问题请随时反馈，祝工作愉快~');
//_file.writeFileSync(path + '帮助说明.txt', resultRows.join('\n'));
var st = Date.now();
transfer(path, config.db_config, xlsxs, function (sql_file_path) {
    console.log('全部转换完成~');
    console.log('开始导入design库，请勿关闭窗口！');
    var db_config = config.db_config.db_game_design;
    var sql_cmd = 'CHCP 65001 & mysql -h' + db_config.host + ' -P' + db_config.port + ' -u' + db_config.user + ' -p' + db_config.password + ' ' + db_config.database + ' < ' + sql_file_path;
    _exec(sql_cmd, function (err, stdout, stderr) {
        if (err !== null) {
            console.log('导入design库报错：');
            console.error(err);
        } else {
            console.log('导入design库完成~');
        }
        console.log('cost time:' + ((Date.now() - st) / 1000).toFixed(0) + 's\n');
        resultRows.forEach(function (line) {
            console.log(line);
        });
        console.log('\n\n\n\n\n\n');
        process.exit(1);
    });
});