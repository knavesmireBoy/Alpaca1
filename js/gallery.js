/*jslint nomen: true */
/*global window: false */
/*global document: false */
/*global Modernizr: false */
/*global gAlp: false */
/*global _: false */
(function (mq, query, touchevents, pausepath, imagepath, picnum, tooltip_msg) {
	"use strict";

	function getNativeOpacity(bool) {
		return {
			getKey: function () {
				return bool ? 'filter' : Modernizr.prefixedCSS('opacity');
			},
			getValue: function (val) {
				/* IE requires that val MUST be a string, took me FOUR days to find this solution*/
				return bool ? 'alpha(opacity=' + val * 100 + ')' : val.toString();
			}
		};
	}

	function filter(coll, pred1) {
		var tmp = _.filter(coll, pred1),
			arr = _.reject(coll, pred1);
		return arr.concat(tmp);
	}

	function greater(a, b) {
		return a > b;
	}

	function greaterBridge(o, p1, p2) {
		return greater(o[p1], o[p2]);
	}

	function getResult(arg) {
		return _.isFunction(arg) ? arg() : arg;
	}

	function equals(a, b) {
		return getResult(a) === getResult(b);
	}

	function add(a, b) {
		return a + b;
	}

	function modulo(n, i) {
		return i % n;
	}

	function increment(i) {
		return i + 1;
	}

	function applyArg(f, arg) {
		arg = _.isArray(arg) ? arg : [arg];
		return f.apply(null, arg);
	}

	function invokeBridge(arr) {
		return applyArg(arr[0], arr[1]);
	}

	function invokeArgs(f) {
		var args = _.rest(arguments);
		return f.apply(null, _.map(args, getResult));
	}
    
    function invoke(f) {
		return f.apply(null, _.rest(arguments));
	}

	function doMethod(o, v, p) {
		//console.log(arguments);
		return o[p] && o[p](v);
	}

	function lazyVal(v, o, p) {
		return doMethod(o, v, p);
	}

	function doCallbacks(cb, coll, p) {
		return _[p](getResult(coll), cb);
	}
	var utils = gAlp.Util,
		/*
		con = function (arg) {
			window.console.log(arg);
			return arg;
		},
        */
		ptL = _.partial,
		doComp = _.compose,
        //creates an object that wraps an iterator, allows setting new instance of iterator ($looper.build) and forwards all requests
        $looper = gAlp.Looper(),
		curryFactory = utils.curryFactory,
		event_actions = ['preventDefault', 'stopPropagation', 'stopImmediatePropagation'],
		eventing = utils.eventer,
		once = utils.doOnce(),
		defer_once = curryFactory(1, true),
		twice = curryFactory(2),
		twicedefer = curryFactory(2, true),
		thrice = curryFactory(3),
		thricedefer = curryFactory(3, true),
		deferEach = thricedefer(doCallbacks)('each'),
		anCr = utils.append(),
		anCrIn = utils.insert(),
		klasAdd = utils.addClass,
		klasRem = utils.removeClass,
		cssopacity = getNativeOpacity(!window.addEventListener),
		$ = thrice(lazyVal)('getElementById')(document),
		$$ = thricedefer(lazyVal)('getElementById')(document),
		main = document.getElementsByTagName('main')[0],
		getThumbs = doComp(utils.getZero, ptL(utils.getByTag, 'ul', main)),
		getAllPics = doComp(ptL(utils.getByTag, 'img'), getThumbs),
		mytarget = !window.addEventListener ? 'srcElement' : 'target',
		getTarget = utils.drillDown([mytarget]),
		parser = thrice(doMethod)('match')(/gal\/big\/\w+\.jpe?g$/),
		doMap = utils.doMap,
		doGet = twice(utils.getter),
		doVal = doGet('value'),
		doParse = doComp(ptL(add, '../'), doGet(0), parser),
		doAlt = doComp(twice(applyArg)(null), utils.getZero, thrice(doMethod)('reverse')(null)),
		unsetPortrait = ptL(klasRem, 'portrait', getThumbs),
		setPortrait = ptL(klasAdd, 'portrait', getThumbs),
        undostatic = ptL(klasRem, 'static', $$('controls')),
		getLength = doGet('length'),
		text_from_target = doComp(doGet('id'), getTarget),
		node_from_target = utils.drillDown([mytarget, 'nodeName']),
		getSlideChild = doComp(utils.getChild, utils.getChild, $$('slide')),
		getBaseChild = doComp(utils.getChild, utils.getChild, $$('base')),
		getBaseSrc = doComp(utils.drillDown(['src']), getBaseChild),
		queryOrientation = thrice(greaterBridge)('clientWidth')('clientHeight'),
		getLI = utils.getDomParent(utils.getNodeByTag('li')),
		getSRC = twice(utils.getter)('src'),
		getDomTargetImg = utils.getDomChild(utils.getNodeByTag('img')),
		$slide_player = utils.makeContext(),
		$setup = utils.makeContext(),
		$controller = utils.makeContext(),
		$static = utils.makeContext(),
		addElements = function () {
			return doComp(twice(applyArg)('img'), anCr, twice(applyArg)('a'), anCr, anCr(getThumbs))('li');
		},
		//height and width of image are compared BUT a) must invoke the comparison AFTER image loaded
		//b) must remove load listener or will intefere with slideshow
		onBase = function (img, path, promise) {
			img.src = path;
			var ev = eventing('load', event_actions.slice(0, 1), function (e) {
				promise.then(e.target);
				ev.undo();
			}, img).execute();
		},
		doInc = function (n) {
			return doComp(ptL(modulo, n), increment);
		},
		doMapLateVal = function (v, el, k) {
			return doMap(el, [
				[k, v]
			]);
		},
		doOrient = doComp(applyArg, ptL(utils.getBest, queryOrientation, [setPortrait, unsetPortrait])),
		//slide and pause 
		onLoad = function (img, path, promise) {
			var ret;
			if (promise) {
				ret = promise.then(getLI(img));
			}
			img.src = path;
			return ret;
		},
		doMapBridge = function (el, v, k) {
			return doMap(el, [
				[k, v]
			]);
		},
		getPausePath = ptL(utils.getBest, doComp(ptL(utils.hasClass, 'portrait'), getThumbs), [pausepath + 'pause_long.png', pausepath + 'pause.png']),
		doMakeBase = function (source, target) {
			var img = addElements();
			doMap(img.parentNode, [
				['href', doParse(source)]
			]);
			doMap(img.parentNode.parentNode, [
				['id', target]
			]);
			return onBase(img, doParse(img.parentNode.href), new utils.FauxPromise(_.rest(arguments, 2)));
		},
        doMakeSlide = function (source, target) {
			var img = addElements();
			doMap(img.parentNode, [
				['href', doParse(getBaseSrc())]
			]);
			doMap(img.parentNode.parentNode, [
				['id', target]
			]);
			return onLoad(img, doParse(img.parentNode.href), new utils.FauxPromise(_.rest(arguments, 2)));
		},
		doMakePause = function (path) {
            if(path){
            var img = addElements();
            doMap(img.parentNode.parentNode, [
				['id', 'paused']
			]);
			doMap(img.parentNode.parentNode, [
				[
					[cssopacity.getKey(), cssopacity.getValue(0.5)]
				]
			]);
			return onLoad(img, path);   
            }
            return onLoad(getDomTargetImg($('paused')), getPausePath());
		},
		loadImage = function (getnexturl, id, promise) {
			var img = getDomTargetImg($(id)),
				next;
			if (img) {
				img.onload = function (e) {
					promise.then(e.target);
				};
				next = getnexturl();
				if (!next) {
					return;
				}
				img.src = doParse(next);
				img.parentNode.href = doParse(img.src);
			}
		},
		loadImageBridge = function () {
			var args = _.rest(arguments, 2);
			args = args.length ? args : [function () {}];
			loadImage.apply(null, _.first(arguments, 2).concat(new utils.FauxPromise(args)));
		},
		makeToolTip = doComp(thrice(doMethod)('init')(null), ptL(gAlp.Tooltip, getThumbs, tooltip_msg, touchevents ? 0 : 2)),
		getValue = doComp(doVal, ptL(doMethod, $looper)),
		showtime = doComp(ptL(klasRem, ['gallery'], getThumbs), ptL(klasAdd, ['showtime'], utils.getBody())),
		playtime = ptL(klasAdd, 'inplay', $('wrap')),
		playing = doComp(ptL(utils.doWhen, once(2), ptL(makeToolTip, true)), ptL(klasAdd, 'playing', main)),
		notplaying = ptL(klasRem, 'playing', main),
		exit_inplay = ptL(klasRem, 'inplay', $('wrap')),
		exitswap = ptL(klasRem, 'swap', utils.getBody()),
		exitshowtime = doComp(ptL(klasAdd, 'gallery', getThumbs), exitswap, ptL(klasRem, 'showtime', utils.getBody()), exit_inplay, notplaying),
		in_play = thricedefer(doMethod)('findByClass')('inplay')(utils),
		nextcaller = twicedefer(getValue)('forward')(),
		prevcaller = twicedefer(getValue)('back')(),
		incrementer = doComp(doInc, getLength),
		do_page_iterator = function (coll) {
			if (coll && typeof coll.length !== 'undefined') {
                $looper.build(_.map(coll, getSRC), incrementer);
			}
		},
		setindex = function (arg) {
            do_page_iterator(getAllPics());
			return $looper.find(arg);
		},
		locator = function (forward, back) {
			var getLoc = function (e) {
				var box = e.target.getBoundingClientRect();
				return e.clientX - box.left > box.width / 2;
			};
			return function (e) {
				return utils.getBest(function (agg) {
					return agg[0](e);
				}, [
					[getLoc, forward],
					[utils.always(true), back]
				]);
			};
		},
		$locate = eventing('click', event_actions.slice(0), function (e) {
			locator(twicedefer(loadImageBridge)('base')(nextcaller), twicedefer(loadImageBridge)('base')(prevcaller))(e)[1]();
			doOrient(e.target);
		}, getThumbs()),
		slide_player_factory = function () {
			return {
				/*remember because images are a mix of landscape and portrait we re-order collection for the slideshow
				so landscapes follow portraits or vice-versa (depending what is the leading pic), this requires undoing when reverting to manual navigation which is invoked by clicking forward/back button, and undo only needs to run once and a fresh slideplayer is created on entering slideshow */
				execute: _.once(do_page_iterator),
				undo: _.once(_.wrap(do_page_iterator, function (orig, coll) {
                    console.log('set orig coll 2')
					orig(coll);
					$looper.find(getBaseSrc());
				}))
			};
		},
        do_static_factory = function () {
            return {
                /* the class of static should be removed from #control on entering slideshow but should run only once PER slideshow session a fresh instance is set up on exiting slideshow */
                execute: _.once(undostatic),
                undo: function () {}
            };
        },
		///slideshow...
		get_play_iterator = function (flag) {
			var coll,
				//index = Looper.onpage.get('index'),
				index = $looper.get('index'),
				outcomes = [_.negate(queryOrientation), queryOrientation],
				tmp = _.map(_.filter(_.map(getAllPics(), getLI), function (li) {
					return !li.id;
				}), getDomTargetImg),
				i = outcomes[0](tmp[index]) ? 0 : 1,
				m = 'undo';
			if (flag) {
				m = 'execute';
				//re-order
				coll = utils.shuffleArray(tmp)(index);
				//split and join again
				coll = i ? filter(coll, outcomes[0]) : filter(coll, outcomes[1]);
                $slide_player.set(slide_player_factory()); 
                console.log('new fac')
			} else {
                console.log('set orig coll')
				//sends original dom-ordered collection when exiting slideshow
				coll = tmp;
			}
			$slide_player[m](coll);
		},
		recur = (function (player) {
            
			function test() {
				return _.map([getBaseChild(), getSlideChild()], function (img) {
					return img && img.width > img.height;
				});
			}

			function doSwap() {
				var coll = test(),
					bool = coll[0] === coll[1],
					body = utils.getClassList(utils.getBody()),
					m = bool ? 'remove' : 'add';
				body[m]('swap');
				return !bool;
			}

			function doRecur() {
				player.inc();
                recur.t = window.requestAnimationFrame(recur.execute); 
			}

			function doOpacity(flag) {
				var slide = $('slide'),
					val;
				if (slide) {
					val = flag ? 1 : recur.i / 100;
					val = cssopacity.getValue(val);
					doMap(slide, [
						[
							[cssopacity.getKey(), val]
						]
					]);
				}
			}

			var playmaker = (function () {
				var setPlayer = function (arg) {
						player = playmaker(arg);
						recur.execute();
					},
                    doBase = ptL(invoke, loadImageBridge, _.bind($looper.play, $looper), 'base', setPlayer, doSwap),
                    doSlide = ptL(invoke, loadImageBridge, doComp(utils.drillDown(['src']), utils.getChild, utils.getChild, $$('base')), 'slide', doOrient),
					fadeOut = {
						validate: function () {
							return recur.i <= -15.5;
						},
						inc: function () {
							recur.i -= 1;
						},
						reset: function () {
							doSlide();
							var body = utils.getClassList(utils.getBody());
							setPlayer(body.contains('swap'));
						}
					},
					fadeIn = {
						validate: function () {
							return recur.i >= 134.5;
						},
						inc: function () {
							recur.i += 1;
						},
						reset: function () {
							doBase();
						}
					},
					fade = {
						validate: function () {
							return recur.i <= -1;
						},
						inc: function () {
							recur.i -= 1;
						},
						reset: function () {
							recur.i = 150;
							doSlide();
							doOpacity();
							doBase();
                            $static.execute();
						}
					},
					actions = [fadeIn, fadeOut];
				return function (flag) {
					return flag ? actions.reverse()[0] : fade;
				};
			}());
			player = playmaker();
			return {
				execute: function () {
					if (!recur.t) {
                        get_play_iterator(true);
                        $static.set(do_static_factory());
                    }
					if (player.validate()) {
						player.reset();
					} else {
						doOpacity();
						doRecur();
					}
				},
				undo: function (flag) {
					doOpacity(flag);
					window.cancelAnimationFrame(recur.t);
                    $static.set(do_static_factory());
                    //flag sent went exiting slideshow, but not pausing
					recur.t = flag ? null : -1;
                    //console.log('undo', arguments)
					//recur.t = null;
				}
			};
		}({})),
		clear = _.bind(recur.undo, recur),
		doplay = _.bind(recur.execute, recur),
		go_execute = thrice(doMethod)('execute')(null),
		go_set = thrice(lazyVal)('set')($controller),
		undo_controller = thricedefer(doMethod)('undo')(null)($controller),
		fastExit = doComp(undo_controller, clear, thrice(lazyVal)('undo')($slide_player)),
		factory = function () {
			var remPause = doComp(utils.removeNodeOnComplete, $$('paused')),
				remSlide = doComp(utils.removeNodeOnComplete, $$('slide')),
				defer = defer_once(doAlt),
				do_slide = defer([clear, doplay]),
				doPlaying = defer([notplaying, playing]),
				doDisplay = defer([function () {}, playtime]),
				unlocate = thricedefer(doMethod)('undo')(null)($locate),
				invoke_player = deferEach([do_slide, doPlaying, doDisplay])(getResult),
				do_invoke_player = doComp(ptL(eventing, 'click', event_actions.slice(0, 2), invoke_player), getThumbs),
				relocate = ptL(lazyVal, null, $locate, 'execute'),
				doReLocate = ptL(utils.doWhen, $$('base'), relocate),
				farewell = [notplaying, exit_inplay, exitswap, /*undo_controller, /*fastExit*/ doReLocate, doComp(doOrient, $$('base')), deferEach([remPause, remSlide])(getResult)],
				next_driver = deferEach([get_play_iterator, defer_once(clear)(true), twicedefer(loadImageBridge)('base')(nextcaller)].concat(farewell))(getResult),
				prev_driver = deferEach([get_play_iterator, defer_once(clear)(true), twicedefer(loadImageBridge)('base')(prevcaller)].concat(farewell))(getResult),
				controller = function () {
					//make BOTH slide and pause but only make pause visible on NOT playing
					if (!$('slide')) {
						doMakeSlide('base', 'slide', /*thricedefer(doMethod)('execute')(null)($controller), go_set, do_invoke_player,*/ unlocate);
                        doMakePause(getPausePath());
					}
                    else {
                        doMakePause();
                    }
				},
				COR = function (predicate, action) {
					var test = _.negate(ptL(equals, 'playbutton'));
					return {
						setSuccessor: function (s) {
							this.successor = s;
						},
						handle: function () {
							if (predicate.apply(this, arguments)) {
								return action.apply(this, arguments);
							} else if (this.successor) {
								return this.successor.handle.apply(this.successor, arguments);
							}
						},
						validate: function (str) {
							if (in_play() && recur.t && test(str)) {
								//return fresh instance on exiting slideshow IF in play mode
								//clear();
								return factory();
							}
							return this;
						}
					};
				},
				mynext = COR(ptL(invokeArgs, equals, 'forwardbutton'), next_driver),
				myprev = COR(ptL(invokeArgs, equals, 'backbutton'), prev_driver),
				myplayer = COR(function () {
                    console.log('play');
					controller();
					return true;
				}, invoke_player);
			myplayer.validate = function () {
				return this;
			};
			mynext.setSuccessor(myprev);
			myprev.setSuccessor(myplayer);
			recur.i = 47; //slide is clone of base initially, so fade can start quickly, ie countdown from lowish figure
			return mynext;
		}, //factory
		setup_val = doComp(thrice(doMethod)('match')(/img/i), node_from_target),
		setup = function (e) {
			//do_page_iterator([]);
			doComp(setindex, utils.drillDown(['target', 'src']))(e);
			doComp(ptL(klasAdd, 'static'), thrice(doMapBridge)('id')('controls'), anCr(main))('section');
			doMakeBase(e.target.src, 'base', doOrient, getBaseChild, showtime);
			var buttons = ['backbutton', 'playbutton', 'forwardbutton'],
				aButton = anCr($('controls')),
				close_cb = ptL(doComp(utils.getDomParent(utils.getNodeByTag('main')), thrice(doMapBridge)('href')('.'), thrice(doMapBridge)('id')('exit'), anCrIn(getThumbs, main)), 'a'),
				dombuttons = _.map(buttons, doComp(thrice(doMapLateVal)('id'), aButton, thrice(doMethod)('slice')(-6))),
				dostatic = ptL(klasAdd, 'static', $$('controls')),
				chain = factory(),
				$controls = eventing('click', event_actions.slice(0, 1), function (e) {
					var str = text_from_target(e),
						node = node_from_target(e);
					if (node.match(/button/i)) {
						//!!REPLACE the original chain reference, validate will return either the original or brand new instance
						chain = chain.validate(str);
						chain.handle(str);
					}
				}, $('controls')),
				$controls_undostat = eventing('mouseover', [], undostatic, utils.getByTag('footer', document)[0]),
				$controls_dostat = eventing('mouseover', [], dostatic, $('controls')),
				$exit = eventing('click', event_actions.slice(0, 1), function (e) {
					if (e.target.id === 'exit') {
						chain = chain.validate('play');
						fastExit();
                        exitshowtime();
						_.each([$('exit'), $('tooltip'), $('controls'), $('paused'), $('base'), $('slide')], utils.removeNodeOnComplete);
						$locate.undo();
						$setup.execute();
					}
				}, close_cb);
			//listeners...
			_.each(_.zip(dombuttons, buttons), invokeBridge);
			_.each([$controls, $exit, $locate, $controls_undostat, $controls_dostat], go_execute);
			$setup.undo();
		};
	$setup.set(eventing('click', event_actions.slice(0, 2), ptL(utils.invokeWhen, setup_val, setup), main));
	$setup.execute();
    /*
	var tgt = utils.getDomChild(utils.getNodeByTag('img'))($('yag')),
	     ie6 = utils.getComputedStyle(tgt, 'color') === 'red' ? true : false;
	utils.report(ie6);
	*/
}(Modernizr.mq('only all'), '(min-width: 668px)', Modernizr.touchevents, '../assets/', /images[a-z\/]+\d+\.jpe?g$/, new RegExp('[^\\d]+\\d(\\d+)[^\\d]+$'), ["move mouse in and out of footer...", "...to toggle the display of control buttons"]));