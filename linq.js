//Array linq by jun 2014/9/16
//v1.4.1
//2015-06-29 v1.2 版 增加count方法
//2015-09-16 v1.3 新增生成数据组功能
//2015-09-23 v1.4 新增数组截取功能：skip、take、limit，以及生成数组功能：random、new
//2015-11-17 v1.4.1 增加each方法如果数据长度为0返回false否则处理完成返回true
//2016-05-27 v1.5 所有接受回调方法的方法均支持字符串写法、修改一些bug
//2017-06-06 v1.5.1 增加remove方法，用于移除数组元素，可按条件、索引等移除;
//                  增加orderBy方法，数组排序，支持多字段子字段排序，支持字符串或数组
//2017-6-10  v1.5.2 回调为字符串时，可使用3个变量i:当前索引 s:当前对象(等同this) a:附加数据(调用linq方法时可以加第2个参数)
(function (self) {
    var ver = '1.5.1';
    //遍历元素 this=当前元素,rtn执行完后返回值(可选);返回值=this或rtn
    self.prototype.each = function (callback,rtn) {
        callback = getFunc(callback);
        if (!callback) return false;
        if (this.length < 1) return false;
        for (var i = 0, ci; ci = this[i]; i++) {
            callback.call(ci, i,rtn);
        }
        return rtn || this;
    };
    //求和 this=当前元素;返回值=当前元素需要累加的值
    self.prototype.sum = function (func,attach) {
        func = getFunc(func,1);
        var sum;
        for (var i = 0, ci; ci = this[i]; i++) {
            var value;
            if (func)
                value = func.call(ci, i,attach);
            else
                value = ci;
            sum = sum ? sum + value : value;
        }
        return sum;
    };
    //过滤元素(该方法会返回一个新数组) this=当前元素;返回值=true/false
    self.prototype.where = function (func,attach) {
        func = getFunc(func,1);
        var result = [];
        for (var i = 0, ci; ci = this[i]; i++) {
            if (func && func.call(ci, i,attach))
                result.push(ci);
        }
        return result;
    }
    //取第一个满足条件的元素 this=当前元素;返回值=true/false
    self.prototype.single = function (func,attach) {
        func = getFunc(func,1);
        for (var i = 0, ci; ci = this[i]; i++) {
            if (func && func.call(ci, i,attach))
                return ci;
        }
    }
    //取最后一个或最后一个满足条件的元素 this=当前元素;返回值=true/false
    self.prototype.last = function (func,attach) {
        func = getFunc(func,1);
        if (!func)
            return this.length > 0 ? this[this.length - 1] : null;
        for (var i = this.length - 1, ci; ci = this[i]; i--) {
            if (func.call(ci, i,attach))
                return ci;
        }
    }
    //取第一个或第一个满足条件的元素 this=当前元素;返回值=true/false
    self.prototype.first = function (func,attach) {
        func = getFunc(func,1);
        if (!func)
            return this.length > 0 ? this[0] : null;
        for (var i = 0, ci; ci = this[i]; i++) {
            if (func.call(ci, i,attach))
                return ci;
        }
    }
    //使用当前数组生成一个新的数组 this=当前元素;返回值=新数组中的元素
    self.prototype.select = function (func,attach) {
        func = getFunc(func,1);
        if (!func)
            return this;
        var result = [];
        for (var i = 0, ci; ci = this[i]; i++) {
            result.push(func.call(ci, i,attach));
        }
        return result;
    }
    //对数组进行分组 this=当前元素;返回值=分组key
    self.prototype.group = function (func,attach) {
        func = getFunc(func,1);
        if (!func)
            return this;
        var obj = {}, result = [];
        for (var i = 0, ci; ci = this[i]; i++) {
            var key = func.call(ci, i,attach);
            if (!obj[key])
                obj[key] = [];
            obj[key].push(ci);
        }
        for (p in obj) {
            obj[p].key = p;
            result.push(obj[p]);
        }
        return result;
    }
    //求数组的长度
    self.prototype.count = function (where) {
        func = getFunc(func,1);
        if (!where) return this.length;
        else return this.where(where).length;
    }
    //跳过数组前count条取剩下的数据
    self.prototype.skip = function (count) {
        return this.slice(count);
    }
    //取前count条数据忽略剩下的数据
    self.prototype.take = function (count) {
        return this.slice(0, count);
    }
    //取数组中间数据，从start（索引）开始 取count条数据，如果只传递一个参数相当于调用take方法
    self.prototype.limit = function (start, count) {
        if (!count) { count = start; start = 0; }
        return this.slice(start, start + count);
    }
    //将当前数组输入到控制台，便于调试  2017.03.23
    self.prototype.out=function(){
        console.log(this);
    }
    //移除数组元素，返回改变后的array(也是当前array)，可接受的参数有function/string(条件)、int(索引)、object(对象)
    self.prototype.remove=function (cond) {
        if(typeof cond=='function' || typeof cond=='string'){
            this.remove(this.where(cond));
        }
        else if(cond instanceof Array){
            var that=this;
            cond.each(function(){
                remove.call(that,that.indexOf(this));
            })
        }
        else{
            var index = (typeof cond=='object')?this.indexOf(cond):cond;
            remove.call(this,index);
        }
        return this;
    }
    //数组排序，支持多字段子字段排序，支持字符串或数组。如 "name、name desc、name asc,age desc、["name","base.arr.length desc"]"
    self.prototype.orderBy=function(fileds){
        var sorts = (typeof fileds=="string"?fileds.split(","):fileds).select(function(){
            var arr = this.split(' ');
            return {
                by:arr[1]||'asc',
                children:arr[0].split('.')
            };
        });
        var getProValue=function(obj,pro){
            var p = obj;
            pro.children.each(function(){
                p=p[this];
            })
            return p;
        }
        var sortFunc=function (a,b) {
            for(var i=0,ci;ci=sorts[i];i++){
                var p1=getProValue(a,ci);
                var p2=getProValue(b,ci);
                var by=[];
                by[0]=ci.by=='asc'?1:0;
                by[1]=ci.by=='desc'?1:0;
                if(p1!=p2){
                    return p1>p2?by[0]:by[1];
                }
            }
            //相等情况
            return 0;
        }
        return this.sort(sortFunc);
    }
    //*****静态方法
    //创建范围数组min含-max含
    self.range = function (min, max) {
        min = min || 0;
        max = max || 100;
        var result = [];
        for (var i = min; i <= max; i++) {
            result.push(i);
        }
        return result;
    }
    //产生一个长度为count的数组并填充随机整数（随机数范围min含-max含，默认为0-100)
    self.random = function (count, min, max) {
        min = min || 0;
        max = max || 100;
        max++;
        var result = [];
        for (var i = 0; i < count; i++) {
            result.push(parseInt((Math.random() * (max - min)) + min));
        }
        return result;
    }
    //产生一个长度为count的数组不填充任何数据，等同于new Array(count)
    self.new = function (count) {
        return new Array(count);
    }
    self.linqVer = ver;
    self.linqAbout = "Array linq " + ver + " by jun";

    //*****内部方法
    //获取方法主体(rtn:0无需返回值 1需要返回当前表示式计算值)
    function getFunc(func, rtn) {
        if (!func) return null;
        if (typeof func == "function") return func;
        var code = "var tmpFunc = function(i,a){ var s=this;";
        if (rtn)
            func = "return " + func;
        code += (func + ";}");
        eval(code);
        return tmpFunc;
    }
    function remove(index){
        return this.splice(index,1);
    }
})(Array);