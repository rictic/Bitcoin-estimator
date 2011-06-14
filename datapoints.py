from google.appengine.api import urlfetch
from google.appengine.api import memcache
import keyvaluestore
import simplejson
import re

def parseDouble(s):
  return float(s)

def extractUSDFromJson(s):
  response = simplejson.loads(s)
  return response["USD"]["24h"]

def extractBTCTransactedFromHtml(s):
  return float(re.compile(r".*<tr>\s+<th>Bitcoins sent <span>last 24h<\/span><\/th>\s+<td>(.*?) BTC<\/td>.*", re.S | re.M).match(s).groups()[0].replace(",", ""))

class DataPoint(object):
  def __init__(self, url, name, parser, cachetime=(60*10)):
    self.url = url
    self.name = name
    self.parser = parser
    self.cachetime = cachetime
  
  def get(self):
    value = memcache.get(self.name) or keyvaluestore.get(self.name)
    if value is None:
      self.updateCache()
      value = memcache.get(self.name)
    return value
  
  def updateCache(self):
    def callback():
      try:
        value = self.parser(rpc.get_result().content)
      except urlfetch.DownloadError, e:
        print "unable to fetch %s: %s" % (self.url, e)
        return
      self.saveValue(value)
    rpc = urlfetch.create_rpc(deadline=10)
    rpc.callback = callback
    urlfetch.make_fetch_call(rpc, self.url)
    return rpc

  def needsUpdate(self):
    return memcache.get(self.name) is None

  def saveValue(self, value):
    keyvaluestore.put(self.name, value)
    memcache.set(self.name, value, time=self.cachetime)
  
datapoints = [
  DataPoint("http://blockexplorer.com/q/getblockcount", "number_of_blocks", parseDouble),
  DataPoint("http://blockexplorer.com/q/hashestowin", "hashes_per_block", parseDouble, 60*60*3),
  DataPoint("http://blockexplorer.com/q/avgtxnumber", "transactions_per_block", parseDouble, 60*60*3),
  DataPoint("http://blockexplorer.com/q/interval", "seconds_per_block", parseDouble, 60*60*3),
  DataPoint("http://bitcoincharts.com/t/weighted_prices.json", "dollars_per_bitcoin", extractUSDFromJson, 60*60),
  DataPoint("http://bitcoinwatch.com/", "bitcoins_transacted_per_day", extractBTCTransactedFromHtml, 60*60*24)
]

