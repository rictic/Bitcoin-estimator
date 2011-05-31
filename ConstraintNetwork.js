var ConstraintNetwork = (function() {
  var i = 0;
  function Constraint(inputs, outputs, transform, name) {
    this.inputs = inputs
    this.outputs = outputs
    this.transform = transform
    this.name = name || "Constraint" + (i++);
  }
  Constraint.prototype.toString = function() {return this.name;}
  function ConstraintNetwork(constraints) {
    this.constraints = constraints || [];
  }
  ConstraintNetwork.prototype.solve = function(mappings) {
    var constraint = getUsableConstraint(mappings, this.constraints);
    var i = 0;
    while (constraint !== null) {
      var newMappings = constraint.transform(mappings);
      console.log(newMappings);
      for (var key in newMappings) {
        if (key in mappings) {
          if (mappings[key] !== newMappings[key]) {
            console.warn("computed " + key + ":" + newMappings[key] + " but previously held it to be " + mappings[key]);
          }
        } else {
          console.log("discovered mapping " + key + ":" + newMappings[key]);
          mappings[key] = newMappings[key];
        }
      }
      
      constraint = getUsableConstraint(mappings, this.constraints);
    }
    
    return mappings;
  }
  ConstraintNetwork.fromEquations = function(var_args) {
    var constraints = [];
    forEach(arguments, function(eq) {
      constraints.push(parseEquation(eq));
    });
    return new ConstraintNetwork(constraints);
  }
  
  function getUsableConstraint(mappings, constraints) {
    console.log(mappings);
    console.log(constraints);
    for (var i = 0; i < constraints.length; i++) {
      var constraint = constraints[i];
      var outputNeeded = false;
      var inputAvailable = true;
      forEach(constraint.outputs, function(output) {
        if (!(output in mappings)) {
          outputNeeded = true;
        }
      });
      forEach(constraint.inputs, function(input) {
        if (!(input in mappings)) {
          inputAvailable = false;
        }
      });
      if (inputAvailable && outputNeeded) {
        console.log("choosing constraint " + constraint);
        return constraint;
      } else {
        console.log("skipping constraint " + constraint + " inputAvailable: " + inputAvailable + " outputNeeded: " + outputNeeded);
      }
    }
    return null;
  }
  
  function parseEquation(equation) {
    eq = equation.replace(/\s/g, "");
    var eqsplit = eq.split("=");        
    var expression = eqsplit[0];
    var output = eqsplit[1];
    var inputs = expression.match(/[a-zA-Z_]+/g);
    
    var transformation = function(mappings) {
      var resultMapping = {};
      console.log(parseTree);
      resultMapping[output] = parseTree.getValue(mappings);
      return resultMapping;
    }
    
    var parseTree;
    
    console.log(expression);
    parseTree = doParse(expression);
    console.log(parseTree);
    
    return new Constraint(inputs, [output], transformation, equation);
  }
  
  function doParse(str) {
    var Expr = function(state) { return Expr(state); }

    var expressionTypes = {
      "+": function(a,b) {return a + b},
      "-": function(a,b) {return a - b},
      "*": function(a,b) {return a * b},
      "/": function(a,b) {return a / b}
    }

    // AST objects
    function Operator(symbol, lhs, rhs) {
        this.symbol = symbol;
        this.lhs = lhs;
        this.rhs = rhs;
    }

    Operator.prototype.toString = function() {
        return uneval(this);
    }

    var Literal = 
      action(repeat1(choice(range('0','9'), ch(','))),
    	  function(ast) {
          return new LiteralNode(parseInt(ast.join("").replace(/,/g, ""), 10));
    	  });
    var Identifier =
      action(repeat1(choice(range('a', 'z'), ch('_'))),
        function(ast) {
          return new LookupNode(ast.join(""));
        });
    var Value = choice(Identifier, Literal, Expr);
    function operator_action(p) {
      return action(p,
  		  function(ast) {
  		    return function(lhs,rhs) {
			      return new ExpressionNode(lhs, rhs, expressionTypes[ast]);
		      };
  		  }
  		);
    }
    var Product = chainl(Value, operator_action(choice('*', '/')));
    var Sum = chainl(Product, operator_action(choice('+', '-')));
    var Expr = Sum;
    return Expr(ps(str)).ast;
  }
  
  function ExpressionNode(lhs, rhs, evaluator) {
    this.lhs = lhs;
    this.rhs = rhs;
    this.evaluator = evaluator;
  }
  ExpressionNode.prototype.getValue = function(mappings) {
    console.log("getting value: ", this.lhs, this.rhs, this.lhs.getValue(mappings), this.rhs.getValue(mappings));
    return this.evaluator(this.lhs.getValue(mappings), this.rhs.getValue(mappings));
  }
  function LookupNode(name) {
    this.name = name;
  }
  LookupNode.prototype.getValue = function(mappings) {
    return mappings[this.name];
  }
  function LiteralNode(value) {
    this.value = value;
  }
  LiteralNode.prototype.getValue = function() {
    return this.value;
  }
  function forEach(arr, f) {
    var l = arr.length;
    for (var i = 0; i < l; i++) {
      f(arr[i]);
    }
  }
  return ConstraintNetwork;
})();