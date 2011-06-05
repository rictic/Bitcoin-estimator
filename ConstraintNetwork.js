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
//       console.log(newMappings);
      for (var key in newMappings) {
        if (key in mappings) {
          if (mappings[key] !== newMappings[key]) {
//             console.warn("computed " + key + ":" + newMappings[key] + " but previously held it to be " + mappings[key]);
          }
        } else {
//           console.log("discovered mapping " + key + ":" + newMappings[key]);
          mappings[key] = newMappings[key];
        }
      }
      
      constraint = getUsableConstraint(mappings, this.constraints);
    }
    
    return mappings;
  }
  ConstraintNetwork.fromEquations = function(equations) {
    var constraints = [];
    forEach(equations, function(eq) {
      constraints = constraints.concat(equationToConstraints(eq));
    });
    return new ConstraintNetwork(constraints);
  }
  
  function getUsableConstraint(mappings, constraints) {
//     console.log(mappings);
    // console.log(constraints);
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
//         console.log("choosing constraint " + constraint);
        return constraint;
      } else {
//         console.log("skipping constraint " + constraint + " inputAvailable: " + inputAvailable + " outputNeeded: " + outputNeeded);
      }
    }
    return null;
  }
  
  function equationToConstraints(equation) {
    var parseTree = parseEquation(equation);
    var expr = parseTree.expression;
    var output = parseTree.output.name;
    
    var constraint = new Constraint(parseTree.inputs, [output], transformation, equation);
    console.log(parseTree);
    constraint.parseTree = parseTree;
    return [constraint];
    
    function transformation(mappings) {
      var resultMapping = {};
      // console.log(parseTree);
      resultMapping[output] = expr.getValue(mappings);
      return resultMapping;
    }
  }
    
  function forEach(arr, f) {
    var l = arr.length;
    for (var i = 0; i < l; i++) {
      f(arr[i]);
    }
  }
  return ConstraintNetwork;
})();


function parseEquation(str) {
  var str = str.replace(/\s/g, "");
  var Expr = function(state) { return Expr(state); }
  
  var inputs = [];
  var Literal = 
    action(repeat1(choice(range('0','9'), ch(','))),
  	  function(ast) {
        return new LiteralNode(parseInt(ast.join("").replace(/,/g, ""), 10));
  	  });
  var IdentifierParser = repeat1(choice(range('a', 'z'), ch('_')));
  var OutputIdentifier = 
    action(IdentifierParser, function(ast) {
      if (ast instanceof LookupNode) {
        return ast;
      }
      return new LookupNode(ast.join(""));
    });
  var Identifier =
    action(IdentifierParser,
      function(ast) {
        if (ast instanceof LookupNode) {
          inputs.push(ast.name);
          return ast;
        }
        var name = ast.join("");

        return new LookupNode(name);
      });
  var Value = choice(Identifier, Literal, Expr);
  function operator_action(p) {
    return action(p,
		  function(ast) {
		    return function(lhs,rhs) {
		      return new ExpressionNode(lhs, rhs, ast);
	      };
		  }
		);
  }
  var Product = chainl(Value, operator_action(choice('*', '/')));
  var Sum = chainl(Product, operator_action(choice('+', '-')));
  var Expr = Sum;
  var Equation = action(choice(
      sequence(Expr, ch('='), OutputIdentifier, end_p), 
      sequence(OutputIdentifier, ch('='), Expr, end_p)
    ), function(ast) {
      var output = ast[2];
      var expression = ast[0];
      if (ast[0] instanceof LookupNode) {
        output = ast[0];
        expression = ast[2];
      }
      return {
          output: output,
          expression: expression
      }
    }
  );
  var result = Equation(ps(str)).ast;
  result.inputs = inputs;
  return result;
}

function ExpressionNode(lhs, rhs, operator) {
  this.lhs = lhs;
  this.rhs = rhs;
  this.operator = operator;
  this.evaluator = getEvaluator(operator);
}
ExpressionNode.prototype.getValue = function(mappings) {
//     console.log("getting value: ", this.lhs, this.rhs, this.lhs.getValue(mappings), this.rhs.getValue(mappings));
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

var getEvaluator = (function(){
  var expressionTypes = {
    "+": function(a,b) {return a + b},
    "-": function(a,b) {return a - b},
    "*": function(a,b) {return a * b},
    "/": function(a,b) {return a / b}
  };
  return function(operator) {
    return expressionTypes[operator];
  }
})()