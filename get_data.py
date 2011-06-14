import simplejson
from datapoints import datapoints

def encodeJson(obj):
  return simplejson.dumps(obj)

result = {}

for datapoint in datapoints:
  value = datapoint.get()
  if value is not None:
    result[datapoint.name] = value


print 'Content-Type: text/plain'
print 'Cache-Control: max-age=15' #doesn't work?
print ''
print encodeJson(result)