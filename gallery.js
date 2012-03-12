Ext.define('SeptarityReport', {
	singleton: true
	
	,moveBuffer: 30
	,useAnimation: false
	,debug: false
	,cursorSize: 15
	,handPlaneWidth: 100
	,handPlaneHeight: 100
	
	
	,constructor: function() {
		this.lastMoveTime = 0;
		this.debug = window.location.hash=='#debug';
		this.cursorOffset = this.cursorSize / 2;
		this.stripLeft = 0;
	
		Ext.onReady(this.domReady, this);
	}
	
	,domReady: function() {
	
		this.statusEl = Ext.get('sr-status');

		this.ct = Ext.get('main');
		this.ct.setStyle('position', 'relative');
		this.ctXY = this.ct.getXY();
		
		this.cursor = this.ct.createChild({
			id: 'cursor'
			,style: {
				position: 'absolute'
				,width: this.cursorSize+'px'
				,height: this.cursorSize+'px'
				,border: '3px solid red'
				,'border-radius': '8px'
				,'z-index': 9999
			}
		});
		
		
		this.photoStrip = Ext.get('photo-strip');

		DJS.on('KinectInit', this.onKinectInit, this);
		DJS.on('Move', this.onMove, this);
		DJS.on('Register', this.onRegister, this);
		DJS.on('Unregister', this.onUnregister, this);
		
	}
	
	
	,onKinectInit: function(data) {
		console.info('kinect init');
		
		// update status
		this.statusEl.update('Kinect Ready<br>Wave to begin!');
	}
	
	,onWindowResize: function() {
		this.ctXY = this.ct.getXY();
	}
	
	,onRegister: function() {
		// update status
		this.statusEl.update('Hand Found');
	}
	
	,onUnregister: function() {
		// update status
		this.statusEl.update('Hand LOST<br>Wave to begin!');
	}
	
	
	,onMove: function(data) {
		var now = new Date().getTime();
		
		// ignore event if within move buffer
		if(this.lastMoveTime + this.moveBuffer > now)
			return;
			
		this.lastMoveTime = now;
		
		// calculate 
		var xFrac = (data.x / this.handPlaneWidth)
			,yFrac = (data.y / this.handPlaneHeight)
			,x = this.ct.getWidth() * xFrac
			,y = this.ct.getHeight() * yFrac
			,border = 6*(50/data.z);
			
		// update status
		//this.statusEl.update('Move ('+data.x+','+data.y+')');
		
		// position cursor
		this.cursor.setLeftTop(x-this.cursorOffset, y-this.cursorOffset);
		this.cursor.setStyle('border-width', border+'px');


		if(data.x < 40)
		{
			this.stripLeft -= 10;
		}
		else if(data.x > 60)
		{
			this.stripLeft += 10;
		}
		
		this.photoStrip.setLeft(this.stripLeft, true);
		
		
		// debug output
		if(this.debug)
		{
			console.log(
				'move to: translate(%o, %o) scale(%o, %o)'
				,newAttrs.translate.x, newAttrs.translate.y
				,newAttrs.scale.x, newAttrs.scale.y
			);
		}
	}
	
	

});