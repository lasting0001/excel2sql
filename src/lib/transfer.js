require('ext4js');
var _file = require('fs');
var _util = require('util');
var xlsx = require('xlsx');
var LinkedList = require('./linked_list');
//var inquirer = require('inquirer');
var q = require('q');
var file_name = 'design.sql';
var sql_file_path = '';

var clone = function (src) {
    var to = {};
    for (var key in src) {
        to[key] = src[key];
    }
    return to;
};

// 特殊字符处理
var escapeColname = function (col) {
    return col.split(' ').join('_').toLowerCase();
};

var escapeValue = function (val) {
    return '\'' + val.trim().split('\'').join('\'\'') + '\'';
};

// 写入文件
var writeRows = function (resultRows, params) {
    sql_file_path = params.file_name = params.path + file_name;
    var df = q.defer();

    if (params.targetFile) {
        _file.appendFileSync(params.file_name, resultRows.join('\n'), 'utf8', function (err) {
            if (err) df.reject(err, params);
        });
    } else {
        resultRows.forEach(function (row) {
            console.log(row);
        });
    }
    delete resultRows;
    df.resolve(params);
    return df.promise;
};

var copyDBKey = function (src, to) {
    for (var key in src) {
        var temp = '`' + key + '`';
        if (!to[temp]) {
            to[temp] = '';
        }
    }
};
var copyDataKey = function (src, to) {
    for (var key in src) {
        if (!to[key]) {
            to[key] = '';
        }
    }
};

//excel转化为sql
var processFile = function (params) {
    var baseInsert = 'INSERT INTO %s (%s) VALUES(%s);';
    var baseUpdate = 'UPDATE %s SET %s WHERE %s;';
    var df = q.defer();
    try {
        var wb = xlsx.readFile(params.sourceFile);
    } catch (err) {
        df.reject(err, params);
    }

    var resultRows = [];
    var sheet = wb.Sheets[wb.SheetNames[0]]; // 只使用第一个表
    var data = xlsx.utils.sheet_to_json(sheet);
    var table_name = params.table;
    var right_cols = params.types[table_name];
    // 不存在该表
    if (right_cols === undefined) {
        console.error('数据库不存在：' + table_name + ',请删除xls');
        df.resolve(resultRows);
        return df.promise;
    }
    resultRows.push('\nTRUNCATE TABLE ' + params.table + ';');
    var columns = {};
    var dataKeys = {};
    // 整理列
    copyDBKey(right_cols, columns);
    copyDataKey(right_cols, dataKeys);
    //生成数据表字段串
    baseInsert = _util.format(baseInsert, table_name, Object.keys(columns).join(','));
    //console.log(columns);
    data.forEach(function (row) {
        if (params.method === 'INSERT') {
            //var cols = [];
            var vals = [];
            for (var key in dataKeys) {
                try {
                    var data = row[key];
                    var type = right_cols[key];
                    if (type === undefined) {
                        continue;
                    }
                    if (data === undefined) {
                        if (type.indexOf('int') > -1) {
                            data = '0';
                        } else if (type.indexOf('char') > -1) {
                            data = '';
                        } else if (type.indexOf('date') > -1) {
                            data = '2000-01-01 00:00:00';
                        } else {
                            data = '0';
                        }
                    } else {
                        if (type.indexOf('int') > -1 && !data.trim()) {
                            data = '0';
                        } else if (type.indexOf('char') > -1 && !data.trim()) {
                            data = '';
                        } else if (type.indexOf('date') > -1) {
                            if (!data.trim()) {
                                data = '2000-01-01 00:00:00';
                            } else {
                                var temp_date = new Date(data);
                                if (temp_date.getFullYear() < 2000) {
                                    temp_date.addYear(100);
                                }
                                data = Date.getDateFormat('-', temp_date);
                            }
                        }
                    }
                    vals.push(escapeValue(data));
                } catch (e) {
                    console.error(e);
                }
            }

            resultRows.push(_util.format(
                baseInsert, vals.join(', ')
            ));
        }
        else if (params.method === 'UPDATE') {
            var setters = [];
            var condition;

            for (var key in row) {
                value = escapeColname(key) + ' = ' + escapeValue(row[key]);
                if (key === params.idColumn) {
                    condition = value;
                }
                else {
                    setters.push(value);
                }
            }

            if (!condition) {
                df.reject('PK column not found in row:\n\t' + JSON.stringify(row));
            }

            resultRows.push(_util.format(
                baseUpdate, params.table, setters.join(', '), condition
            ));
        }
        delete vals;
    });

    df.resolve(resultRows);
    return df.promise;
};

function getAllColumnTypes(callBack) {
    var sql1 = "SELECT table_name FROM information_schema.tables WHERE table_schema='db_game_design' AND table_type='base table'";
    _DBQuery(sql1, function (results) {
        //console.log(results);
        var c_types = {};
        var count = results.length, over = 0;
        results.forEach(function (e) {
            var sql2 = "SELECT  COLUMN_NAME as 'name',COLUMN_COMMENT AS 'comment',DATA_TYPE as 'type' FROM information_schema.`COLUMNS` " +
                "WHERE table_schema = 'db_game_design' AND TABLE_NAME LIKE '%s'";
            var temp = _util.format(sql2, e.table_name);
            _DBQuery(temp, function (results1, params) {
                var table_columns = {};
                results1.forEach(function (c) {
                    (!c_types[params.table_name]) && (table_columns = {}) && (c_types[params.table_name] = table_columns);
                    table_columns[c.name] = c.type;
                });
                (++over === count) && (callBack(c_types));
            }, {table_name: e.table_name});
        });
    });
}

function run(list, callBack) {
    var configs = list.cutHead();
    if (configs === null) {
        return callBack(sql_file_path);
    }
    processFile(configs).then(function (rows) {
        return writeRows(rows, configs);
    }).then(function (configs) {
        console.log(configs.table + '转sql完成！');
        run(list, callBack);
    }).catch(function (err, configs) {
        console.log(configs.table + '转sql错误：');
        console.log(err);
        process.exit(1);
    });
}

var params = {
    method: 'INSERT'
};

function Transfer(path, db_config, srcFiles, callback) {
    // 数据库
    var db = require('node-db')(db_config);
    global._DBQuery = db.query;
    global._DBBatch = db.batch;
    // 工作目录
    params.path = path;
    // 删除过期文件
    _file.writeFileSync(params.path + file_name, '');
    // 获取所有表所有字段的类型，以给默认值
    getAllColumnTypes(function (types) {
        console.log('获取所有表和字段类型完毕...');
        params.types = types;
        // 链表
        var list = new LinkedList();
        srcFiles.forEach(function (f) {
            var name = f.split('.')[0];
            var configs = clone(params);
            configs.sourceFile = configs.path + f;
            configs.targetFile = configs.path + name + '.sql';
            configs.table = name;
            list.addTail(configs);
        });
        run(list, callback);
    });
}

//var files = [
//    't_s_skilltemplate.xlsx',
//    't_s_config.xlsx'
//];
//Transfer('E:/temp/', files, function () {
//    console.log('all done~');
//});
//getAllColumnTypes(function (results) {
//    console.log(results);
//});

module.exports = Transfer;


// 交互并形成配置
//var startPrompt = function () {
//    return inquirer.prompt([{
//        name: 'sourceFile',
//        message: 'Source excel file:',
//        default: process.argv[2]
//    }, {
//        name: 'targetFile',
//        message: 'Target .sql filename: (leave empty for standard output)'
//    }, {
//        name: 'table',
//        message: 'Target [schema].table?',
//        default: 'public.test'
//    }, {
//        name: 'method',
//        message: 'What type of statement to generate?',
//        type: 'list',
//        choices: ['INSERT', 'UPDATE']
//    }, {
//        name: 'idColumn',
//        message: 'Header title of the Primary Key column?',
//        when: function (answers) {
//            return answers.method === 'UPDATE';
//        },
//        validate: function (input) {
//            return input && input.length > 0 ? true : 'PK column cannot be empty';
//        }
//    }
//    ]);
//};

//startPrompt()
//    .then(function (answers) {
//        params = answers;
//        return processFile();
//    })
//    .then(function (rows) {
//        return writeRows(rows);
//    })
//    .then(function () {
//        console.log('All done.')
//    })
//    .catch(function (err) {
//        console.log(err);
//        process.exit(1);
//    });
