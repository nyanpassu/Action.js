// Generated by CoffeeScript 1.10.0
(function() {
  var Action, fireByResult, makeNodeCb, spawn;

  fireByResult = function(cb, data) {
    if (data instanceof Action) {
      return data._go(cb);
    } else {
      return cb(data);
    }
  };

  Action = (function() {
    function Action(_go1) {
      this._go = _go1;
    }

    Action.prototype._next = function(cb) {
      var self;
      self = this;
      return new Action(function(_cb) {
        return self._go(function(data) {
          return fireByResult(_cb, cb(data));
        });
      });
    };

    Action.prototype.next = function(cb) {
      var self;
      self = this;
      return new Action(function(_cb) {
        return self._go(function(data) {
          if (data instanceof Error) {
            return _cb(data);
          } else {
            return fireByResult(_cb, cb(data));
          }
        });
      });
    };

    Action.prototype.guard = function(cb) {
      var self;
      self = this;
      return new Action(function(_cb) {
        return self._go(function(data) {
          if (data instanceof Error) {
            return fireByResult(_cb, cb(data));
          } else {
            return _cb(data);
          }
        });
      });
    };

    Action.prototype.go = function(cb) {
      return this._go(function(data) {
        if (data instanceof Error) {
          throw data;
        } else {
          if (cb != null) {
            return cb(data);
          } else {
            return data;
          }
        }
      });
    };

    return Action;

  })();

  Action.wrap = function(data) {
    return new Action(function(cb) {
      return cb(data);
    });
  };

  Action.signal = new Action(function(cb) {
    return cb;
  });

  Action.fuseSignal = function(actions, fireAtError) {
    var l;
    if (fireAtError == null) {
      fireAtError = false;
    }
    l = actions.length;
    if (l > 0) {
      return new Action(function(cb) {
        var action, fireByIndex, flags, i, j, k, len, ref, results, returns;
        results = new Array(l);
        returns = new Array(l);
        flags = new Array(l);
        for (i = j = 0, ref = l - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
          flags[i] = false;
        }
        fireByIndex = function(index) {
          return function(data) {
            var k, noErrorAndFalse, ref1;
            results[index] = data;
            flags[index] = true;
            noErrorAndFalse = true;
            for (i = k = 0, ref1 = l - 1; 0 <= ref1 ? k <= ref1 : k >= ref1; i = 0 <= ref1 ? ++k : --k) {
              if (flags[i] === false) {
                noErrorAndFalse = false;
              }
              if (results[i] instanceof Error && fireAtError) {
                noErrorAndFalse = false;
                cb(results[i]);
                break;
              }
            }
            if (noErrorAndFalse) {
              return cb(results);
            }
          };
        };
        for (i = k = 0, len = actions.length; k < len; i = ++k) {
          action = actions[i];
          returns[i] = action._go(fireByIndex(i));
        }
        return returns;
      });
    } else {
      return Action.wrap([]);
    }
  };

  Action.freeze = function(action) {
    var callbacks, data, handler, pending;
    pending = true;
    data = void 0;
    callbacks = [];
    handler = action._go(function(_data) {
      var cb, j, len;
      if (pending) {
        data = _data;
        pending = false;
        for (j = 0, len = callbacks.length; j < len; j++) {
          cb = callbacks[j];
          cb(_data);
        }
        return callbacks = void 0;
      }
    });
    return new Action(function(cb) {
      if (pending) {
        callbacks.push(cb);
      } else {
        cb(data);
      }
      return handler;
    });
  };

  Action.safe = function(err, fn) {
    return function(data) {
      var e, error;
      try {
        return fn(data);
      } catch (error) {
        e = error;
        return err;
      }
    };
  };

  Action.safeRaw = function(fn) {
    return function(data) {
      var e, error;
      try {
        return fn(data);
      } catch (error) {
        e = error;
        return e;
      }
    };
  };

  Action.chain = function(monadicActions) {
    return function(init) {
      var a, j, len, monadicAction, ref;
      if (monadicActions.length > 0) {
        a = monadicActions[0](init);
        ref = monadicActions.slice(1);
        for (j = 0, len = ref.length; j < len; j++) {
          monadicAction = ref[j];
          a = a.next(monadicAction);
        }
        return a;
      } else {
        return Action.wrap(void 0);
      }
    };
  };

  Action.repeat = function(times, action, stopAtError) {
    var a;
    if (stopAtError == null) {
      stopAtError = false;
    }
    return a = action._next(function(data) {
      if (((data instanceof Error) && stopAtError) || times-- === 0) {
        return data;
      } else {
        return a;
      }
    });
  };

  Action.delay = function(delay, action) {
    return new Action(function(cb) {
      return setTimeout(cb, delay);
    })._next(function() {
      return action;
    });
  };

  Action.retry = function(times, action) {
    var a;
    return a = action.guard(function(e) {
      if (times-- !== 0) {
        return a;
      } else {
        return new Error('RETRY_ERROR: Retry limit reached');
      }
    });
  };

  Action.throttle = function(actions, n, stopAtError) {
    var l;
    if (stopAtError == null) {
      stopAtError = false;
    }
    l = actions.length;
    if (n > l) {
      n = l;
    }
    if (l > 0) {
      return new Action(function(cb) {
        var countDown, countUp, fireByIndex, handlerArray, i, j, ref, resultArray;
        countUp = n;
        countDown = l;
        resultArray = new Array(l);
        fireByIndex = function(index) {
          return function(data) {
            countDown--;
            if (data instanceof Error && stopAtError && countDown !== -1) {
              countDown = -1;
              return cb(data);
            } else {
              resultArray[index] = data;
              if (countDown === 0) {
                return cb(resultArray);
              } else if (countUp < l) {
                actions[countUp]._go(fireByIndex(countUp));
                return countUp++;
              }
            }
          };
        };
        handlerArray = new Array(n);
        for (i = j = 0, ref = n - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
          handlerArray[i] = actions[i]._go(fireByIndex(i));
        }
        return handlerArray;
      });
    } else {
      return Action.wrap([]);
    }
  };

  Action.parallel = function(actions, stopAtError) {
    if (stopAtError == null) {
      stopAtError = false;
    }
    return Action.throttle(actions, actions.length, stopAtError);
  };

  Action.sequence = function(actions, stopAtError) {
    if (stopAtError == null) {
      stopAtError = false;
    }
    return Action.throttle(actions, 1, stopAtError);
  };

  Action.join = function(action1, action2, cb2, stopAtError) {
    if (stopAtError == null) {
      stopAtError = false;
    }
    return new Action(function(cb) {
      var countDown, result1, result2;
      result1 = result2 = void 0;
      countDown = 2;
      return [
        action1._go(function(data) {
          result1 = data;
          if ((result1 instanceof Error) && stopAtError) {
            countDown = -1;
            return cb(result1);
          } else {
            countDown--;
            if (countDown === 0) {
              return fireByResult(cb, cb2(result1, result2));
            }
          }
        }), action2._go(function(data) {
          result2 = data;
          if ((result2 instanceof Error) && stopAtError) {
            countDown = -1;
            return cb(result2);
          } else {
            countDown--;
            if (countDown === 0) {
              return fireByResult(cb, cb2(result1, result2));
            }
          }
        })
      ];
    });
  };

  Action.race = function(actions, stopAtError) {
    var l;
    if (stopAtError == null) {
      stopAtError = false;
    }
    l = actions.length;
    if (l > 0) {
      return new Action(function(cb) {
        var action, countDown, handlerArray, i, j, len;
        countDown = l;
        handlerArray = new Array(l);
        for (i = j = 0, len = actions.length; j < len; i = ++j) {
          action = actions[i];
          handlerArray[i] = action._go(function(data) {
            countDown--;
            if ((!(data instanceof Error)) || stopAtError) {
              if (typeof cb === "function") {
                cb(data);
              }
              cb = void 0;
              return countDown = -1;
            } else if (countDown === 0) {
              return cb(new Error('RACE_ERROR: All actions failed'));
            }
          });
        }
        return handlerArray;
      });
    } else {
      return Action.wrap(new Error('RACE_ERROR: All actions failed'));
    }
  };

  makeNodeCb = function(cb) {
    return function(err, data) {
      return cb(err ? err : data);
    };
  };

  Action.makeNodeAction = function(nodeAPI) {
    return function(a, b, c) {
      var _go, args, i, l, self;
      self = this;
      l = arguments.length;
      switch (l) {
        case 0:
          _go = function(cb) {
            return nodeAPI.call(self, makeNodeCb(cb));
          };
          break;
        case 1:
          _go = function(cb) {
            return nodeAPI.call(self, a, makeNodeCb(cb));
          };
          break;
        case 2:
          _go = function(cb) {
            return nodeAPI.call(self, a, b, makeNodeCb(cb));
          };
          break;
        case 3:
          _go = function(cb) {
            return nodeAPI.call(self, a, b, c, makeNodeCb(cb));
          };
          break;
        default:
          i = l;
          args = new Array(l + 1);
          while (i-- > 0) {
            args[i] = arguments[i];
          }
          _go = function(cb) {
            args[l] = makeNodeCb(cb);
            return nodeAPI.apply(self, args);
          };
      }
      return new Action(_go);
    };
  };

  spawn = function(gen, action, cb) {
    return action._go(function(v) {
      var done, nextAction, ref;
      if (v instanceof Error) {
        gen["throw"](v);
      }
      ref = gen.next(v), nextAction = ref.value, done = ref.done;
      if (done) {
        return cb(v);
      } else {
        return spawn(gen, nextAction, cb);
      }
    });
  };

  Action.co = function(genFn) {
    return function() {
      var gen;
      gen = genFn.apply(this, arguments);
      return new Action(function(cb) {
        return spawn(gen, gen.next().value, cb);
      });
    };
  };

  if ((typeof module !== "undefined" && module !== null) && (module.exports != null)) {
    module.exports = Action;
  } else if (typeof define === "function" && define.amd) {
    define(function() {
      return Action;
    });
  } else if (typeof window !== "undefined" && window !== null) {
    window.Action = Action;
  }

}).call(this);
