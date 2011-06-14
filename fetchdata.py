from datapoints import datapoints

rpcs = [dp.updateCache() for dp in datapoints if dp.needsUpdate()]
print 'Content-Type: text/plain'
print ''
for rpc in rpcs:
  rpc.wait()

print "Finished"
