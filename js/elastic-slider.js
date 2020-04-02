function ElasticSlider(el, options){
    this.el = typeof el === 'string' ? document.querySelector(el) : el;
    this.init(options);
}

ElasticSlider.prototype = {
    init: function(options){
        this.items = this.el.children;
        this.len = this.items.length;
        // Force slider to have at least 3 items
        if (this.len < 3) {
            throw new Error('ElasticSlider must have at least 3 items.');
        }
        this.mouseDown = false;
        this.animating = false;
        this.width = 0;

        this.maxStretch = options && options.hasOwnProperty('maxStretch') ? parseFloat(options.maxStretch) : 100;
        this.bezierLen = options && options.hasOwnProperty('bezierLen') ? parseFloat(options.bezierLen) : 80;

        this.rect = this.el.getBoundingClientRect();
        this.sliderWidth = this.rect.width;
        this.sliderHeight = this.rect.height;

        this.initOrder();
        this.initSVG();
        this.initPaths();
        this.initEvents();
    },

    initOrder: function(){
        this.currentIndex = 0;
        this.updateElements();
        this.addClasses();
    },

    initSVG: function(){
        this._svgNS = 'http://www.w3.org/2000/svg';
        this.clippedLeft = document.createElementNS(this._svgNS, 'clipPath');
        this.clippedRight = document.createElementNS(this._svgNS, 'clipPath');
        this.clippedLeft.id = 'clipped-left';
        this.clippedRight.id = 'clipped-right';
        this.s = new Snap(this.sliderWidth, this.sliderHeight);
        this.s.select('defs').node.appendChild(this.clippedLeft);
        this.s.select('defs').node.appendChild(this.clippedRight);
        this.el.appendChild(this.s.node);
    },

    initPaths: function(){
        this.optionsLeft = {x1: 0, y1: 0, y2: this.sliderHeight, width: 0, bezierLen: this.bezierLen, offset: this.sliderWidth, leftSide: true};
        this.optionsLeftAux = {x1: 0, y1: 0, y2: this.sliderHeight, width: 0, bezierLen: this.bezierLen, offset: this.sliderWidth, leftSide: true};
        this.curveLeft = this.createPath(this.optionsLeft);
        this.pLeft = this.s.path(this.curveLeft).attr({
            transform: 't-'+this.sliderWidth+', 0'
        });

        this.optionsRight = {x1: this.sliderWidth, y1: 0, y2: this.sliderHeight, width: 0, bezierLen: this.bezierLen, offset: this.sliderWidth};
        this.optionsRightAux = {x1: this.sliderWidth, y1: 0, y2: this.sliderHeight, width: 0, bezierLen: this.bezierLen, offset: this.sliderWidth};
        this.curveRight = this.createPath(this.optionsRight);
        this.pRight = this.s.path(this.curveRight).attr({
            transform: 't-'+this.sliderWidth+', 0'
        });

        this.clippedLeft.appendChild(this.pLeft.node);
        this.clippedRight.appendChild(this.pRight.node);
    },

    createPath: function(o){
        var x1 = o.x1, y1 = o.y1, x2 = x1, y2 = o.y2, x3 = (x1 + o.width), y3 = (y2 - y1) / 2, len = o.bezierLen, offset = o.offset;
        var out = ["M", x1 + offset, y1, "C", x1 + offset, (y1 + len), x3 + offset, (y3 - len), x3 + offset, y3, "S", x2 + offset, (y2 - len), x2 + offset, y2, "L"];
        o.leftSide ? out.push(x1, y2, "L", x1, y1) : out.push(x1 + offset*2, y2, "L", x1 + offset*2, y1);
        return out.join(" ");
    },

    initEvents: function(){
        this.initDown();
        this.initUp();
        this.initMove();
    },

    initDown: function(){
        var self = this;
        self.el.onmousedown = function(e){animStart(e.pageX);}
        self.el.ontouchstart = function(e){animStart(e.touches[0].clientX);} // touchstart event
        function animStart(b){
            if(!self.animating){
                self.mouseDown = true;
                self.initialX = b;
            }
        }
    },

    initUp: function(){
        var self = this;
        document.onmouseup = animStop();
        document.ontouchend = animStop(); // touchend event
        function animStop(){
            if(self.mouseDown && !self.animating){
                self.mouseDown = false;
                self.pLeft.stop().animate({'path' : self.curveLeft}, 200, mina.easeout);
                self.pRight.stop().animate({'path' : self.curveRight}, 200, mina.easeout);
            }
        }
    },

    initMove: function(){
        var self = this;
        self.el.onmousemove = function(e){animMove(e.pageX);};
        self.el.ontouchmove = function(e){animMove(e.touches[0].clientX);}; // touchmove event
        function animMove(z){
            if(self.mouseDown && !self.animating){
                self.width = z- self.initialX;
                if(z > self.initialX){
                    self.prevAnimation();
                }else{
                    self.nextAnimation();
                }
            }
        }
    },

    prevAnimation: function(){
        var self = this;
        self.pRight.stop().attr({'path' : self.curveRight});
        if(self.width < self.maxStretch){
            self.optionsLeftAux.width = self.width;
            self.pLeft.stop().attr({ d: self.createPath(self.optionsLeftAux) });
        }else{
            self.mouseDown = false;
            self.animating = true;
            self.optionsLeft.x1 = self.maxStretch*2;
            self.optionsLeft.width = - self.maxStretch*3/4;
            var middleCurve = self.createPath(self.optionsLeft);
            self.optionsLeft.x1 = self.maxStretch*2;
            self.optionsLeft.width = self.maxStretch/4;
            var middleCurve2 = self.createPath(self.optionsLeft);
            self.optionsLeft.x1 = self.maxStretch*3;
            self.optionsLeft.width = 0;
            var totalCurve = self.createPath(self.optionsLeft);
            self.pLeft.stop().animate({'transform' : 't-'+(self.maxStretch*3 - 50)+',0'}, 300, mina.easein, function(){
                self.pLeft.animate({'transform' : 't-'+(self.maxStretch*3)+',0'}, 200, mina.easein);
            });
            self.pLeft.animate({'path' : middleCurve}, 200, mina.easein, function(){
                self.pLeft.animate({'path' : middleCurve2}, 100, mina.easein, function(){
                    self.pLeft.animate({'path' : totalCurve}, 200, mina.easein, function(){
                        self.prev();
                        self.updateStates();
                        self.pLeft.stop().attr({d: self.curveLeft, transform: 't-'+self.sliderWidth+', 0'});
                        self.animating = false;
                    });
                });
            });
        }
    },

    nextAnimation: function(){
        var self = this;
        self.pLeft.stop().attr({'path' : self.curveLeft});
        if(self.width > -self.maxStretch){
            self.optionsRightAux.width = self.width;
            self.pRight.stop().attr({ d: self.createPath(self.optionsRightAux) });
        }else{
            self.mouseDown = false;
            self.animating = true;
            self.pRight.stop().animate({'path' : self.curveRight}, 2000, mina.elastic);
            self.optionsRight.x1 = self.sliderWidth - self.maxStretch*2;
            self.optionsRight.width = self.maxStretch*3/4;
            var middleCurveRight = self.createPath(self.optionsRight);
            self.optionsRight.x1 = self.sliderWidth - self.maxStretch*2;
            self.optionsRight.width = - self.maxStretch/4;
            var middleCurveRight2 = self.createPath(self.optionsRight);
            self.optionsRight.x1 = self.sliderWidth - self.maxStretch*3;
            self.optionsRight.width = 0;
            var totalCurveRight = self.createPath(self.optionsRight);
            self.pRight.stop().animate({'transform' : 't-'+(self.sliderWidth*2 - (self.maxStretch*3 - 50))+',0'}, 300, mina.easein, function(){
                self.pRight.animate({'transform' : 't-'+(self.sliderWidth*2 - self.maxStretch*3)+',0'}, 200, mina.easein);
            });
            self.pRight.animate({'path' : middleCurveRight}, 200, mina.easein, function(){
                self.pRight.animate({'path' : middleCurveRight2}, 100, mina.easein, function(){
                    self.pRight.animate({'path' : totalCurveRight}, 200, mina.easein, function(){
                        self.next();
                        self.updateStates();
                        self.pRight.stop().attr({d: self.curveRight, transform: 't-'+(self.sliderWidth)+', 0'});
                        self.animating = false;
                    });
                });
            });
        }
    },

    prev: function(){
        this.currentIndex = this.getPrevIndex();
    },

    next: function(){
        this.currentIndex = this.getNextIndex();
    },

    getPrevIndex: function() {
        return this.currentIndex > 0 ? this.currentIndex - 1 : this.len - 1;
    },

    getNextIndex: function() {
        return this.currentIndex + 1 < this.len ? this.currentIndex + 1 : 0;
    },

    updateStates: function(){
        this.removeClasses();
        this.updateElements();
        this.addClasses();
    },

    removeClasses: function(){
        this.currentItem.classList.remove('current');
        this.prevItem.classList.remove('clipped-left');
        this.nextItem.classList.remove('clipped-right');
    },

    updateElements: function(){
        this.currentItem = this.items[this.currentIndex];
        this.prevItem = this.items[this.getPrevIndex()];
        this.nextItem = this.items[this.getNextIndex()];
    },

    addClasses: function(){
        this.currentItem.classList.add('current');
        this.prevItem.classList.add('clipped-left');
        this.nextItem.classList.add('clipped-right');
    }
};