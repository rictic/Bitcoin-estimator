from google.appengine.ext import db

class KeyValues(db.Expando):
  pass

backend = None
def getBackend():
  global backend
  if backend is None:
    backend = KeyValues.all().get()
    if backend is None:
      backend = KeyValues()
  return backend

def put(key, value):
  backend = getBackend()
  setattr(backend, key, value)
  backend.put()
  
def get(key):
  try:
    return getattr(getBackend(), key)
  except:
    return None