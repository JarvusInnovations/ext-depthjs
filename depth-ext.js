Ext.define('DJS', {
	singleton: true
	,mixins: {
		observable: 'Ext.util.Observable'
	}
	
	
	,MAX_HANDPLANE_WIDTH: 500
	,MAX_HANDPLANE_HEIGHT: 500

	,constructor: function() {
		this.addEvents('KinectInit','Register','Unregister','Move','SwipeLeft','SwipeRight','SwipeDown','SwipeUp','Push','Pull','HandClick');
		Ext.onReady(this.domReady, this);
	}
	
	,domReady: function() {

		this.eventEl = Ext.getBody().createChild({
			id: 'DepthJS_eventPort'
			,style: {
				display:'none'
			}
		}).on('DepthJSEvent', function() {

			var data = Ext.decode(this.eventEl.dom.innerText);
			this.fireEvent(data.type, data.data, data.type);
			
		}, this);
	}

});