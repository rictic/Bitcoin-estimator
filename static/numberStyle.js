/** @constructor **/
function NumberStyle(round, add_separators, prefix, suffix, preprocessor) {
  this.round = round === undefined ? false : round;
  this.add_separators = add_separators === undefined ? true : add_separators;
  this.prefix = prefix || "";
  this.suffix = suffix || "";
  this.preprocessor = preprocessor || function(x){return x;};
}
NumberStyle.prototype.renderNumber = function(num) {
  var self = this;
  num = this.preprocessor(num);
  if (this.round === true) {
    this.round = 0;
    
    num = Math.round(num);
  } 
  if (this.round !== false) {
    var factor = Math.pow(10, this.round);
    num *= factor;
    num = Math.round(num);
    num /= factor;
  }
  num = num + "";
  var parts = num.split(".");
  if (parts.length === 2) {
    num = addSeparators(parts[0]) + "." + parts[1];
  } else {
    if (num.match(/^\d+$/)) {
      num = addSeparators(num);
    }
  }
  return (this.prefix || "") + num + (this.suffix || "");
  
  function addSeparators(val) {
    if (self.add_separators !== undefined && !self.add_separators) {
      return val;
    }
    val = val + "";
    var result = "";
    for (var i = 0; i < val.length; i++) {
      if (i > 0 && i % 3 === 0) {
        result = "," + result;
      }
      result = val.charAt(val.length - 1 - i) + result;
    }
    return result;
  }
}
