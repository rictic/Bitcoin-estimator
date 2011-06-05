import simplejson
from google.appengine.api.urlfetch import fetch
from google.appengine.api import memcache

def encodeJson(obj):
  return simplejson.dumps(obj)

def parseDouble(s):
  return float(s)

def extractUSDFromJson(s):
  response = simplejson.loads(s)
  return response["USD"]["24h"]

class DataPoint(object):
  def __init__(self, url, name, parser, cachetime=(60*10)):
    self.url = url
    self.name = name
    self.parser = parser
    self.cachetime = cachetime
  
  def get(self):
    value = memcache.get(self.name)
    if value is None:
      value = self.fetch()
      memcache.set(self.name, value, time=self.cachetime)
    return value
  
  def fetch(self):
    result = fetch(self.url)
    body = result.content
    return self.parser(body)

datapoints = [
  DataPoint("http://blockexplorer.com/q/getblockcount", "number_of_blocks", parseDouble),
  DataPoint("http://blockexplorer.com/q/hashestowin", "hashes_per_block", parseDouble, 60*60*3),
  DataPoint("http://blockexplorer.com/q/avgtxnumber", "transactions_per_block", parseDouble, 60*60*3),
  DataPoint("http://blockexplorer.com/q/interval", "seconds_per_block", parseDouble, 60*60*3),
  DataPoint("http://bitcoincharts.com/t/weighted_prices.json", "dollars_per_bitcoin", extractUSDFromJson, 60*60)
]
# "http://bitcoincharts.com/t/weighted_prices.json"

result = {}

for datapoint in datapoints:
  result[datapoint.name] = datapoint.get()


print 'Content-Type: text/plain'
print 'Cache-Control: max-age=60' #doesn't work?
print ''
print encodeJson(result)