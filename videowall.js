(function( global, $){
	
	var _this = {},
		urls = {
			'gnews' : 'https://ajax.googleapis.com/ajax/services/search/news?v=1.0&topic=el&alt=json-in-script&callback=?',
			'aorg' : 'http://archive.org/advancedsearch.php?q=%28{query}%29%20AND%20format:(Ogg%20video)&fl%5B%5D=downloads&fl%5B%5D=identifier&fl%5B%5D=language&fl%5B%5D=publicdate&fl%5B%5D=publisher&fl%5B%5D=source&fl%5B%5D=subject&fl%5B%5D=title&fl%5B%5D=year&sort%5B%5D=&sort%5B%5D=&sort%5B%5D=&rows=50&page=1&output=json&callback=?',
			'adownloadUrl' : 'http://www.archive.org/download/{id}/format={format}'
		},
		totalVideoCount = 24,
		users = {};
	
	/* setup global ref */ 
	global.videoWall = _this;
	global.videoWall.users = users;
	
	_this.build = function( target ){
		
		_this.$target = $( target );
		_this.$target.text('loading...');
		
		var hashTag = location.hash;
		if( hashTag != "" ){
			_this.buildWallForQuery( hashTag.substr(1) ); 
		} else { 
			_this.getNewsQuery( function( query ){
				location.hash = '#' + query;
				_this.buildWallForQuery( query );
			})
		}
		
		// Setup document bindings: 
		$( window ).bind('hashchange', function( event ) {
			_this.$target.html('loading ...');
			var hashTag = location.hash;
			_this.buildWallForQuery( hashTag.substr(1) ); 
		});
	};
	
	_this.getNewsQuery = function( callback ){
		// get election news:
		$.getJSON( urls.gnews, function( data ){
			try {
				var articles = data.responseData.results;
				if( articles[0] && articles[0].titleNoFormatting ){
                    callback( $('<div>').html( articles[0].titleNoFormatting ).text() );
				}
			} catch( e ){
				throw new Error("Sorry, no election news articles :( ( probably api key not valid ) ::" + e );
			}
		});
	};
	
	// handles a query displays a video wall from archive.org search. 
	_this.buildWallForQuery = function( query ){
		$('#vid-wall-title').text( query );
		var query = query.replace(/ /g, ' OR ');
		var vidCount = 0;
		archiveUtil.searchTV( query, function( videoItems ) {
			_this.$target.text('');
			$.each( videoItems, function( inx, doc ){
				if( vidCount > totalVideoCount){
					return ;
				}
				vidCount++;
				_this.$target.append(
					$('<div class=\"video-container\" />')
					.append( $('<video />').attr({
						'poster' : doc.thumb,
						'src': doc.video,
						'preload': 'none'
					})
					.data('meta', doc)
				));
			});
			// once all the video is in the page bind the videos
			_this.bindVideos();
			
		});
	};
	
	_this.bindVideos = function(){
		// bind each video, as well as set up globals
		_this.$target.find('video')
		.each( function( inx, curentVideo ){
			// make sure the base volume is zero
			$( curentVideo )[0].muted = true;
			// make base opacity .5
			$( curentVideo ).css( 'opacity', '.5');
		})
        .click(function() {
            var vid = $( this )[0];
            vid.play();
            vid.muted = false;
            $("#metadata").html("<b>" + $(this).data('meta').title + "</b><br ><br>" + $(this).data('meta').snip);
            connection.sendMessage({
                videoOver: $(this).data('meta').identifier
            });
        })
		.hoverIntent({
			'over': function(){
				var vid = $( this )[0];
				vid.play();
				vid.muted = false;
				$("#metadata").html("<b>" + $(this).data('meta').title + "</b><br ><br>" + $(this).data('meta').snip);
                connection.sendMessage({
                    videoOver: $(this).data('meta').identifier
                });
                _this.callPeer( $(this).data('meta').identifier );
			},
			'out': function(){
				var vid = $( this )[0];
				vid.muted = true;
				vid.pause();
                connection.sendMessage({
                    videoOut: $(this).data('meta').identifier
                });
                hangup();
			}
		});
	};

	_this.applyStyle = function( overSet, maxUsers, el ) {
		var percentage = overSet ? overSet.length / maxUsers : 0,
        scale = overSet ? ( 0.5 * users/maxUsers + 1 ) : 1,
        container = el.parent();
        
        // set opacity: 
        el.css({
			'opacity': percentage + 0.5
        });
        // set size:
		container.css({
			"-webkit-transform": "scale( " + scale  + "," + scale + ")",
      "-moz-transform": "scale( " + scale  + "," + scale + ")",
      "-ms-transform": "scale( " + scale  + "," + scale + ")",
      "-o-transform": "scale( " + scale  + "," + scale + ")",
      "transform": "scale( " + scale  + "," + scale + ")"
		});
        // set color size
        if( overSet ){
	        var cs = Math.floor( 10 / overSet.length ),
            curCs = cs,
            boxShadowString = "";

	        for( var i=0; i<overSet.length; i++ ) {
	        	var userId = overSet[i];
            
            boxShadowString += 'inset 0 0 0 ' + cs + 'px ' +  _this.getUserColor( userId );
            if ( i < overSet.length - 1 && overSet.length > 1 ) {
              boxShadowString += ", ";
            }
	        	curCs = curCs + cs;
	        }
          el.css({
            "-webkit-transform": "scale( .8, .8 )",
            "-moz-transform": "scale( .8, .8 )",
            "-o-transform": "scale( .8, .8 )",
            "-ms-transform": "scale( .8, .8 )",
            "transform": "scale( .8, .8 )"
          });
          el.parent().css({
            'box-shadow': boxShadowString
          });
        } else {
          el.css({
            "-webkit-transform": "scale( 1, 1 )",
            "-moz-transform": "scale( 1, 1 )",
            "-o-transform": "scale( 1, 1 )",
            "-ms-transform": "scale( 1, 1 )",
            "transform": "scale( 1, 1 )"
          });
          el.parent().css({
            'box-shadow': "none"
          });
        }
	};
	
	_this.getUserColor = function( userId ){
		var colors = [ '#D799A6', '#3761AE', '#CAA385', '#8FA3A4', '#3798DC', '#F771A2' ];
		var inx = userId % colors.length;
		return colors[ inx ];
	};
	
	_this.syncInterface = function(){
        var userOverSet = {};
		$.each( users, function( userId, user ){
			if( user.videoOver ){
				if( ! userOverSet[ user.videoOver ] ){
					userOverSet[ user.videoOver ] = [];
				}
				userOverSet[ user.videoOver ].push( userId );
            };
        });
		_this.$target.find('video').each(function() {
             var $video = $(this);
             var overSet = userOverSet[ $video.data('meta').identifier ];
             $video.data('userOverSet', overSet );
             _this.applyStyle( overSet, Object.keys(users).length, $video );
         });
	};

    _this.callPeer = function ( videoId ) {
		$.each( users, function( userId, user ){
            if (!user.isLocal && user.videoOver == videoId) {
                call(userId);
            }
        });
    };

	_this.activeUserInput =false;
	_this.syncUserList = function(){
		if( _this.activeUserInput ){
			return ;
		}
		
		var $listEl = $("#user-list");
		$listEl.html('');
		$.each( users, function( userId, user ){
			var uname = ( user.name || userId ) ;
			$listEl.append( 
				$( "<li />" ).append( 
						$("<span class=\"color\"><span class=\"icon icon-white icon-user\"></span>" + uname + "</span>" )
						.css({
							'color': _this.getUserColor( userId )
						})
				).click( function(){
					if( user.isLocal ){
						_this.activeUserInput = true;
						$( this ).parent().attr('title', 'click to edit');
						$( this ).unbind().html( 
								$('<input />').change(function(){
									users[userId].name = $( this ).val();
									localStorage.name =  $( this ).val();
									// sync the user name across the network
									connection.sendMessage( {} );
									_this.activeUserInput = false;
									_this.syncUserList();
								})
							)
						$( this ).find('input').focus();
					}
				})
			)
		});
	}
	
    //share mouse position
    var lastMove=0;
    $(document).on('mousemove', function(evt) {
        var now = +new Date;
        if(now-lastMove > 100) {
            lastMove = now;
            connection.sendMessage({
                position: {x: evt.clientX, y: evt.clientY}
            });
        }
    });

    // websocket connection, bind events with
    //   connection.onMessage(callback)
    //
    //   to send messages to all other users:
    //   connection.sendmessage({a: b})
    //
    // make local
    var connection = global.connection = (function() {
        var that = {},
            userId = localStorage.id || Math.round(Math.random() * 10000000000000),
            name = localStorage.name,
            callbacks = [],
            ws;
        localStorage.id = userId;
        
        users[ userId ] = {
        		'name' : localStorage.name || "You, ( click to update)",
        		'isLocal': true
        }
        _this.syncUserList();
        
        connect();
        function connect() {
            ws = new WebSocket('ws://r-w-x.org:8044/');
            ws.onclose = function(evt) {
                connect();
            };
            ws.onmessage = function(evt) {
                var data = JSON.parse(evt.data);
                if (data.user != userId && data.hash == location.hash) {
                    callbacks.forEach(function(callback) {
                        callback(data);
                    })
                }
            };
        };

        that.debug = function() {
            that.onMessage(function(data) { 
                console.log('message', data);
            });
        };

        that.sendMessage = function(data) {
            message = JSON.stringify({
                user: userId,
                name: localStorage.name,
                hash: location.hash,
                data: data
            })
            ws.send(message)
        };

        that.onMessage = function(callback) {
            callbacks.push(callback);
        };

        return that;
    })();
    
    connection.onMessage(function(msg) {
    	if( ! users [ msg.user ] ||  users [ msg.user ].name != msg.name ){
    		users [ msg.user ] = {
    				'name' : msg.name
    			}
    		_this.syncUserList();
	    };
        if (msg.data.videoOver) {
        	users [ msg.user ][ 'videoOver' ] = msg.data.videoOver;
        } else if (msg.data.videoOut) {
        	users [ msg.user ][ 'videoOver' ]  = null;
        }
        if (msg.data.videoOver || msg.data.videoOut) {
            _this.syncInterface();
        }
    });

})( window, window.jQuery )
