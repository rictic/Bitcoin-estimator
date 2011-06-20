var units = (function() {
  var units = {};
  
  units.parseExpression = function(s) {
    var parseResult = Expression(ps(s));
    if (parseResult === false) {
      throw new Error("Unable to parse expression `" + s + "`");
    }
    return parseResult.ast;
  }
  
  var mostRecentUnit;
  var UnitText = action(sequence(action(repeat0(choice(range('a','z'), range('A','Z'), ' ', 'μ')), 
    function(ast) {
      mostRecentUnit = units.parseUnit(ast.join(""));
      return mostRecentUnit;
    }
  ), semantic(function() {
    return !!mostRecentUnit;
  })),
    function(ast) {
      return ast[0];
    }
  );
  
  /* Expression Parsing: */
  var Literal = action(sequence(optional("-"), repeat1(choice(range('0','9'), ',', '.')), UnitText),
    function(ast) {
//       console.log(ast);
      var f = ast[1].join("").replace(/,/g, "");
      if (ast[0]) {
        f = "-" + f;
      }
      return new LiteralNode(Quantity.fromValueAndUnit(parseFloat(f), ast[2]));
	  }
  );
  function Expr(state) {
    return Expr(state);
  }
  var ParenExpr = action(sequence('(', Expr, ')'), function(ast) {return ast[1]});
  var Value = choice(ParenExpr, Literal);
  var Product = chainl(whitespace(Value), whitespace(operator_action(choice('*', '/'))));
  var Sum = chainl(whitespace(Product), whitespace(operator_action(choice('+', '-'))));
//   var PrefExpr = action(sequence(Sum, optional(sequence(" in ", UnitText))), function(ast){
//     if (ast[1]) {
//       return new PreferenceNode(ast[0], ast[1][1])
//     } else {
//       return ast[0];
//     }
//     
//   });
  Expr = Sum;
  
  
  var Expression = Expr;
  Expression = action(sequence(Expression, end_p),
    function(ast) {
      return ast[0];
    }
  );
  
  function operator_action(p) {
    return action(p,
		  function(ast) {
		    return function(lhs,rhs) {
		      return new ExpressionNode(lhs, rhs, ast);
	      };
		  }
		);
  }
  
  
  /* Expression AST nodes: */
  /** @constructor **/
  function ValueNode() {}
  ValueNode.prototype.multiply = function(o) {
    return this.evaluate().multiply(o.evaluate());
  }
  ValueNode.prototype.add = function(o) {
    return this.evaluate().add(o.evaluate());
  }
  ValueNode.prototype.subtract = function(o) {
    return this.evaluate().subtract(o.evaluate());
  }
  ValueNode.prototype.divide = function(o) {
    return this.evaluate().divide(o.evaluate());
  }
  ValueNode.prototype.toString = function() {
    return "<VN " + JSON.stringify(this) + ">"; 
  }
  /** @constructor **/
  function LiteralNode(value) {
    this.value = value;
  }
  LiteralNode.prototype = new ValueNode();
  LiteralNode.prototype.evaluate = function() {
    return this.value;
  }
  LiteralNode.prototype.toString = function() {
    return "<L " + this.value + " >"
  }
  
  /** @constructor **/
  function ExpressionNode(lhs, rhs, operator) {
    this.lhs = lhs;
    this.rhs = rhs;
    this.operator = operator;
    this.evaluator = getEvaluator(operator);
  }
  ExpressionNode.prototype = new ValueNode();
  ExpressionNode.prototype.evaluate = function() {
//     console.log(this);
    return this.evaluator(this.lhs, this.rhs);
  }
  ExpressionNode.prototype.toString = function() {
    return "<E " + this.lhs + " " + this.operator + " " + this.rhs + ">";
  }
  
  function PreferenceNode(vNode, unit) {
    this.vNode = vNode;
    this.unit = unit;
  }
  PreferenceNode.prototype = new ValueNode();
  PreferenceNode.prototype.evaluate = function() {
    var q = this.vNode.evaluate();
    return q.convertTo(unit);
  }
  
  var getEvaluator = (function(){
    var expressionTypes = {
      "+": function(a,b) {return a.add(b)},
      "-": function(a,b) {return a.subtract(b)},
      "*": function(a,b) {return a.multiply(b)},
      "/": function(a,b) {return a.divide(b)}
    };
    return function(operator) {
      return expressionTypes[operator];
    }
  })()
  
  units.parseUnit = function(s) {
    for (var i = 0; i < units.knownUnits.length; i++) {
      var unit = units.knownUnits[i];
      if (unit.matches(s)) {
        return unit;
      }
    }
  }
  
  /** @constructor **/
  function Quantity(standardValue, convertedValue, unit) {
    this.convertedValue = convertedValue;
    this.standardValue = standardValue;
    this.unit = unit;
  }
  Quantity.fromValueAndUnit = function(value, unit) {
    return new Quantity(unit.toStandard(value), value, unit);
  }
  Quantity.prototype.add = function(o) {
    //TODO: assert that the two units are identical
    if (!this.unit.equals(o.unit)) {
      throw new Error("Cannot add a " + this.unit + " to a " + o.unit);
    }
    return Quantity.fromValueAndUnit(this.standardValue + o.standardValue, this.unit.baseUnit || this.unit);
  }
  Quantity.prototype.subtract = function(o) {
    if (!this.unit.equals(o.unit)) {
      throw new Error("Cannot subtract an " + o.unit + " from a " + this.unit);
    }
    return Quantity.fromValueAndUnit(this.standardValue - o.standardValue, this.unit.baseUnit || this.unit);
  }
  Quantity.prototype.multiply = function(o) {
    return Quantity.fromValueAndUnit(this.standardValue * o.standardValue, this.unit.multiply(o.unit));
  }
  Quantity.prototype.divide = function(o) {
    return Quantity.fromValueAndUnit(this.standardValue / o.standardValue, this.unit.divide(o.unit));
  }
  Quantity.prototype.convertTo = function(oUnit) {
    //TODO: validate that oUnit and this.unit are compatible
    return new Quantity(this.standardValue, oUnit.fromStandard(this.standardValue), oUnit);
  }
  Quantity.prototype.aboutEquals = function(o) {
    var a = this.standardValue;
    var b = o.standardValue;
//     if (!(a + 0.00001 >= b)) {
//       console.log("first bad");
//       debugger;
//     }
//     if (!(a - 0.00001 <= b)) {
//       console.log("second bad");
//     }
//     if (!this.unit.equals(o.unit)) {
//       console.log("unit bad");
//     }
    return (a + 1.00001 >= b) && (a - 0.99999 <= b) && this.unit.equals(o.unit);
  }
  Quantity.prototype.toString = function() {
    return this.standardValue + " " + this.unit;
  }
  
  /** @constructor **/
  function BaseUnit() {}
  BaseUnit.prototype = {
    toStandard: function(v) {return v;},
    fromStandard: function(v) {return v;},
    multiply: function(oUnit) {
      return new ComplexUnit(addAmounts(this.complexForm().unitAmounts, oUnit.complexForm().unitAmounts));
    },
    divide: function(oUnit) {
      var oAmounts = oUnit.complexForm().unitAmounts;
      for (var i = 0; i < oAmounts.length; i++) {
        oAmounts[i][0] = -oAmounts[i][0];
      }
      return new ComplexUnit(addAmounts(this.complexForm().unitAmounts, oAmounts));
    },
    equals: function(oUnit) {
      var amounts = this.complexForm().unitAmounts.slice();
      var oAmounts = oUnit.complexForm().unitAmounts.slice();
      while(amounts.length > 0) {
        var amount = amounts.pop();
        var found = false;
        for (var i = 0; i < oAmounts.length; i++) {
          if (oAmounts[i][1].shortName === amount[1].shortName) {
            if (amount[0] === oAmounts[i][0]) {
              oAmounts.splice(i, 1);
              found = true;
              break;
            }
            return false;
          }
        }
        if (!found) {
          return false;
        }
      }
      if (oAmounts.length > 0) {
        return false;
      }
      return true;
    },
    toString: function(accessor) {
      accessor = accessor || "shortName";
      var amounts = this.complexForm().unitAmounts;
      var parts = [];
      var subParts = [];
      for (var i = 0; i < amounts.length; i++) {
        var part = amounts[i][1][accessor];
        var exp = Math.abs(amounts[i][0]);
        if (exp !== 1) {
          part += "^" + exp;
        }
        if (amounts[i][0] < 0) {
          subParts.push(part);
        } else {
          parts.push(part);
        }
      }
      var numer = parts.join(" ");
      var denom = subParts.join(" ");
      if (subParts.length > 0) {
        return numer + " per " + denom;
      }
      return numer;
    },
    toFullString: function() {
      return this.toString("fullName")
    }
  }
  
  var EmptyUnit = new BaseUnit();
  EmptyUnit.shortName = "";
  EmptyUnit.fullName = "";
  EmptyUnit.matches = function(s) {return !!s.match(/^\s*$/)};
  EmptyUnit.complexForm = function() {return new ComplexUnit([])};
  EmptyUnit.baseUnit = EmptyUnit;
  
  /** @constructor **/
  function SimpleUnit() {}
  SimpleUnit.prototype = new BaseUnit();
  SimpleUnit.prototype.matches = function(s) {
    return !!s.match(this.unitMatcher);
  }
  SimpleUnit.prototype.toJSON = function() {
    return "<" + this.fullName + ">";
  }
  SimpleUnit.prototype.complexForm = function() {
    if (this.baseUnit.unitAmounts) {
      return this.baseUnit;
    }
    return new ComplexUnit([[1, this.baseUnit]]);
  }
  
  /** @constructor **/
  function ComplexUnit(unitAmounts) {
    this.unitAmounts = unitAmounts;
  }
  ComplexUnit.prototype = new BaseUnit();
  ComplexUnit.prototype.complexForm = function() {return this;}
  
  function addAmounts(amounts, oAmounts) {
    amounts = amounts.slice();
    oAmounts = oAmounts.slice();
    var newUnitAmounts = [];
    while(amounts.length > 0) {
      var amount = amounts.pop();
      for (var i = 0; i < oAmounts.length; i++) {
        if (oAmounts[i][1].equals(amount[1])) {
          amount[0] += oAmounts[i][0];
          oAmounts.splice(i, 1);
          break;
        }
      }
      if (amount[0] !== 0){
        newUnitAmounts.push(amount);
      }
    }
    return newUnitAmounts.concat(oAmounts);
  }
  
  function makeMultFactors(multiplier) {
    return {
      toStandard: function(v) {
        return v * multiplier;
      },
      fromStandard: function(v) {
        return v / multiplier;
      }
    }
  }
  
  function makeMetricConversionFactors(exponent) {
    return makeMultFactors(Math.pow(10, exponent));
  }
  
  units.knownUnits = [EmptyUnit];
  
  var metricUnits = [
    ['distance',            'm',   'meters'],
    ['mass',                'g',   'grams'],
    ['electric current',    'A',   'amperes'],
    ['amount of substance', 'mol', 'moles'],
    ['temperature',         'K',   'degrees kelvin', 'kelvin'],
    ['luminous intensity',  'cd',  'candela'],
    ['time',                's',   'seconds'],
    ['information',         'B',   'bytes']
  ]
  
  var makeMetricUnits = (function() {
    var metricFactors = [
      ["", "", 0],
      ["Y", "yotta", 24],
      ["Z", "zetta", 21],
      ["E", "exa", 18],
      ["P", "peta", 15],
      ["T", "tera", 12],
      ["G", "giga", 9],
      ["M", "mega", 6],
      ["k", "kilo", 3],
      ["m", "milli", -3],
      ["μ", "micro", -6],
      ["n", "nano", -9],
      ["p", "pico", -12],
      ["f", "femto", -15],
      ["a", "atto", -18],
      ["z", "zepto", -21],
      ["y", "yocto", -24]
    ]
    
    return function makeMetricUnits(dimension, shortName, otherNames) {
      var baseUnit = null;
      var names = [shortName].concat(otherNames);
      var result = [];
      for (var j = 0; j < metricFactors.length; j++) {
        var prefix = metricFactors[j];
        var factors = makeMetricConversionFactors(prefix[2]);
        var unit = new SimpleUnit();
        unit.toStandard = factors.toStandard;
        unit.fromStandard = factors.fromStandard;
        baseUnit = baseUnit || unit;
        unit.baseUnit = baseUnit;
        unit.shortName = prefix[0] + shortName;
        unit.fullName = prefix[1] + (names[1] || shortName);
        unit.unitMatcher = RegExp("^\\s*(" + prefix.slice(0,2).join("|") + ")\\s*(" + names.join("|") +")\\s*$")
        result.push(unit);
      }
      return result;
    }
  })()
  
  for (var i = 0; i < metricUnits.length; i++) {
    var unitBase = metricUnits[i];
    var unitsWithBase = makeMetricUnits(unitBase[0], unitBase[1], unitBase.slice(2));
    units.knownUnits = units.knownUnits.concat(unitsWithBase);
  }

  var assortedUnits = [
    ["60s", "min", "minutes", "minute"],
    ["60min", "h", "hours", "hour"],
    ["24h", "days", "days", "day"],
    ["30 days", "months", "month"],
    ["365 days", "years", "year"],
    ["1000 years", "millinia", "millinia", "millinium"],
    ["1 / 1s", "Hz", "hertz"],
    ["1kg * 1m / (1s * 1s)", "N", "newtons", "newton"]
  ]

  for (var i = 0; i < assortedUnits.length; i++) {
    var asu = assortedUnits[i];
    var q = units.parseExpression(asu[0]).evaluate();
    var factors = makeMultFactors(q.standardValue);
    var unit = new SimpleUnit();
    unit.toStandard = factors.toStandard;
    unit.fromStandard = factors.fromStandard;
    unit.baseUnit = q.unit.baseUnit || q.unit;
    unit.shortName = asu[1];
    unit.fullName = asu[2] || unit.shortName;
    unit.unitMatcher = RegExp("^\\s*(" + asu.slice(1).join("|")  + ")\\s*$")
    units.knownUnits.push(unit);
  }

  return units;
})();