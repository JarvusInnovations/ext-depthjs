Ext.define('KinectGallery', {
	singleton: true
	
	,moveBuffer: 30
	,useAnimation: false
	,debug: false
	,cursorSize: 15
	,handPlaneWidth: 100
	,handPlaneHeight: 100
	,imagesToLoad: 15
	,backBuffer: 5
	,slideWidth: 880
	,imgSrcPrefix: '/gallery-photos/'
	
	,velocityBase: 2.4
	,frameRate: 100
	,deceleration: 1000
	
	
	,constructor: function() {
		this.debug = window.location.hash=='#debug';
		this.cursorOffset = this.cursorSize / 2;

		this.currentSlides = [];
		this.imageFiles = [];
		this.firstImgIndex = 0;
		
		this.xVelocity = 0;
		this.secsPerFrame = 1/this.frameRate;
		this.trackingHand = false;
		this.decelPixPerFrame = this.deceleration * this.secsPerFrame;
	
		Ext.onReady(this.domReady, this);
	}
	
	,domReady: function() {
	
		this.statusEl = Ext.get('kinect-status');

		this.ct = Ext.getBody();
		
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
		

		DJS.on('KinectInit', this.onKinectInit, this);
		DJS.on('Move', this.onMove, this);
		DJS.on('Register', this.onRegister, this);
		DJS.on('Unregister', this.onUnregister, this);
		
		// load images
		Ext.Ajax.request({
			url: 'gallery-photos.json'
			,scope: this
			,success: function(response) {
				this.imageFiles = Ext.decode(response.responseText);
				this.initGallery();
			}
		});
	}
	
	
	,onKinectInit: function(data) {
		console.info('kinect init');
		
		// update status
		this.statusEl.update('Kinect ready, wave at me to take control!');
		
		this.trackingHand = false;
	}
	
	,onWindowResize: function() {
		this.ctXY = this.ct.getXY();
	}
	
	,onRegister: function() {
		// update status
		this.statusEl.update('Hand Found');
		Ext.getBody().addCls('tracking');
		
		this.trackingHand = true;
	}
	
	,onUnregister: function() {
		// update status
		this.statusEl.update('I lost track of your hand, wave at me to take control');
		Ext.getBody().removeCls('tracking');
		
		this.trackingHand = false;
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
			this.xVelocity = Math.pow(this.velocityBase, (40-data.x)/4);
		}
		else if(data.x > 60)
		{
			this.xVelocity = Math.pow(this.velocityBase, (data.x - 60)/4) * -1;
		}
		else
		{
			this.xVelocity = 0;
		}

		
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
	
	
	,initGallery: function() {
		while(this.currentSlides.length < this.imagesToLoad)
		{
			var nextImgIndex = this.firstImgIndex + this.currentSlides.length
				,xPos = nextImgIndex * this.slideWidth;
				
			this.currentSlides.push({
				x: xPos
				,el: this.ct.createChild({
					cls: 'slide'
					,cn: {
						tag: 'img'
						,src: this.imgSrcPrefix + this.imageFiles[nextImgIndex]
					}
					,style: {
						left: xPos+'px'
					}
				})
			});
			
		}
		
		//console.log('initialized slides', this.currentSlides);
		
		// start animation interval
		setInterval(Ext.bind(this.onFrame, this), 1000/this.frameRate);
	}
	
	,onFrame: function() {
		//console.log('onFrame, velocity = ', this.xVelocity);
		
		var xDelta = this.xVelocity * this.secsPerFrame;
		
		// do nothing if we're at an end
		if(this.currentSlides[0].x + xDelta > 0)
			return;
		else if(this.currentSlides[this.currentSlides.length - 1].x + xDelta < 0)
			return;
		
		// move all the current images by xVelocity
		Ext.each(this.currentSlides, function(slide) {
			slide.x += xDelta;
			slide.el.setLeft(slide.x, true);
		}, this);
		
		// decelerate if not tracking
		if(!this.trackingHand)
		{
			if(this.xVelocity - this.decelPixPerFrame > 0)
				this.xVelocity -= this.decelPixPerFrame;
			else if(this.xVelocity + this.decelPixPerFrame < 0)
				this.xVelocity += this.decelPixPerFrame;
			else
				this.xVelocity = 0;
		}
		
		// shift images if backbuffer is exceeded
		if(this.xVelocity < 0 && this.currentSlides[this.backBuffer].x < 0)
			this.shiftRight();
		else if(this.xVelocity > 0 && this.currentSlides[this.currentSlides.length - this.backBuffer].x > this.slideWidth)
			this.shiftLeft();
	}
	
	
	,shiftRight: function() {
	
		if(this.firstImgIndex + this.currentSlides.length >= this.imageFiles.length)
			return false;
	
		var nextImgIndex = this.firstImgIndex + this.currentSlides.length
			,xPos = this.currentSlides[this.currentSlides.length - 1].x + this.slideWidth;
	
		// add an image to the right
		this.currentSlides.push({
			x: xPos
			,el: this.ct.createChild({
				cls: 'slide'
				,cn: {
					tag: 'img'
					,src: this.imgSrcPrefix + this.imageFiles[nextImgIndex]
				}
				,style: {
					left: xPos+'px'
				}
			})
		});
		
		
		// remove from left
		var removeSlide = this.currentSlides.shift();
		removeSlide.el.remove();
		this.firstImgIndex++;
	}
	
	
	,shiftLeft: function() {
	
		if(this.firstImgIndex == 0)
			return false;
	
		var nextImgIndex = --this.firstImgIndex
			,xPos = this.currentSlides[0].x - this.slideWidth;
	
		// add an image to the left
		this.currentSlides.unshift({
			x: xPos
			,el: this.ct.createChild({
				cls: 'slide'
				,cn: {
					tag: 'img'
					,src: this.imgSrcPrefix + this.imageFiles[nextImgIndex]
				}
				,style: {
					left: xPos+'px'
				}
			}, this.currentSlides[0].el.dom)
		});
		
		
		// remove from right
		var removeSlide = this.currentSlides.pop();
		removeSlide.el.remove();
	}
});