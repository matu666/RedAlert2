/*
 * minilzo-js
 * JavaScript port of minilzo by Alistair Braidwood
 *
 * Copied from original project for global `lzo1x` compatibility
 */
var lzo1x = (function () {
	'use strict';

	function _lzo1x() {
		this.blockSize = 128 * 1024;
		this.minNewSize = this.blockSize;
		this.maxSize = 0;

		this.OK = 0;
		this.INPUT_OVERRUN = -4;
		this.OUTPUT_OVERRUN = -5;
		this.LOOKBEHIND_OVERRUN = -6;
		this.EOF_FOUND = -999;
		this.ret = 0;

		this.buf = null;
		this.buf32 = null;

		this.out = new Uint8Array(256 * 1024);
		this.cbl = 0;
		this.ip_end = 0;
		this.op_end = 0;
		this.t = 0;

		this.ip = 0;
		this.op = 0;
		this.m_pos = 0;
		this.m_len = 0;
		this.m_off = 0;

		this.dv_hi = 0;
		this.dv_lo = 0;
		this.dindex = 0;

		this.ii = 0;
		this.jj = 0;
		this.tt = 0;
		this.v = 0;

		this.dict = new Uint32Array(16384);
		this.emptyDict = new Uint32Array(16384);

		this.skipToFirstLiteralFun = false;
		this.returnNewBuffers = true;

		this.setBlockSize = function(blockSize) {
			if(typeof blockSize === 'number' && !isNaN(blockSize) && parseInt(blockSize) > 0) {
				this.blockSize = parseInt(blockSize);
				return true;
			} else {
				return false;
			}
		};

		this.setOutputSize = function(outputSize) {
			if(typeof outputSize === 'number' && !isNaN(outputSize) && parseInt(outputSize) > 0) {
				this.out = new Uint8Array(parseInt(outputSize));
				return true;
			} else {
				return false;
			}
		};

		this.setReturnNewBuffers = function(b) {
			this.returnNewBuffers = !!b;
		};

		this.applyConfig = function(cfg) {
			if(cfg !== undefined) {
				if(cfg.outputSize !== undefined) {
					instance.setOutputSize(cfg.outputSize);
				}
				if(cfg.blockSize !== undefined) {
					instance.setBlockSize(cfg.blockSize);
				}
			}
		};

		this.extendBuffer = function() {
	        var newBuffer = new Uint8Array(this.minNewSize + (this.blockSize - this.minNewSize % this.blockSize));
	        newBuffer.set(this.out);
	        this.out = newBuffer;
	        this.cbl = this.out.length;
	    };

	    this.match_next = function() {
	        this.minNewSize = this.op + 3;
	        if(this.minNewSize > this.cbl) {this.extendBuffer();}
	        this.out[this.op++] = this.buf[this.ip++];
	        if(this.t > 1) {
	            this.out[this.op++] = this.buf[this.ip++];
	            if(this.t > 2) {
	                this.out[this.op++] = this.buf[this.ip++];
	            }
	        }
	        this.t = this.buf[this.ip++];
	    };

	    this.match_done = function() {
	        this.t = this.buf[this.ip-2] & 3;
	        return this.t;
	    };

	    this.copy_match = function() {
	        this.t += 2;
	        this.minNewSize = this.op + this.t;
	        if(this.minNewSize > this.cbl) {this.extendBuffer();}
	        do {
	            this.out[this.op++] = this.out[this.m_pos++];
	        } while(--this.t > 0);
	    };

	    this.copy_from_buf = function() {
	    	this.minNewSize = this.op + this.t;
	        if(this.minNewSize > this.cbl) {this.extendBuffer();}
	        do {
	            this.out[this.op++] = this.buf[this.ip++];
	        } while (--this.t > 0);
	    };

	    this.match = function() {
	        for (;;) {
	            if (this.t >= 64) {
	                this.m_pos = (this.op - 1) - ((this.t >> 2) & 7) - (this.buf[this.ip++] << 3);
	                this.t = (this.t >> 5) - 1;
	                this.copy_match();
	            } else if (this.t >= 32) {
	                this.t &= 31;
	                if (this.t === 0) {
	                    while (this.buf[this.ip] === 0) {
	                        this.t += 255;
	                        this.ip++;
	                    }
	                    this.t += 31 + this.buf[this.ip++];
	                }
	                this.m_pos = (this.op - 1) - (this.buf[this.ip] >> 2) - (this.buf[this.ip + 1] << 6);
	                this.ip += 2;
	                this.copy_match();
	            } else if (this.t >= 16) {
	                this.m_pos = this.op - ((this.t & 8) << 11);
	                this.t &= 7;
	                if (this.t === 0) {
	                    while (this.buf[this.ip] === 0) {
	                        this.t += 255;
	                        this.ip++;
	                    }
	                    this.t += 7 + this.buf[this.ip++];
	                }
	                this.m_pos -= (this.buf[this.ip] >> 2) + (this.buf[this.ip + 1] << 6);
	                this.ip += 2;
	                if (this.m_pos === this.op) {
	                    this.state.outputBuffer = this.returnNewBuffers === true ?
	                    	new Uint8Array(this.out.subarray(0, this.op)) :
	                    	this.out.subarray(0, this.op);
	                    return this.EOF_FOUND;
	                } else {
	                	this.m_pos -= 0x4000;
		            this.copy_match();
	                }
	            } else {
	                this.m_pos = (this.op - 1) - (this.t >> 2) - (this.buf[this.ip++] << 2);
	                this.minNewSize = this.op + 2;
	                if(this.minNewSize > this.cbl) {this.extendBuffer();}
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.out[this.op++] = this.out[this.m_pos];
	            }
	            if(this.match_done() === 0) {
	                return this.OK;
	            }
	            this.match_next();
		    }
	    };

	    this.decompress = function(state) {
	        this.state = state;
	        this.buf = this.state.inputBuffer;
	        this.cbl = this.out.length;
	        this.ip_end = this.buf.length;
	        this.t = 0;
	        this.ip = 0;
	        this.op = 0;
	        this.m_pos = 0;
	        this.skipToFirstLiteralFun = false;
	        if (this.buf[this.ip] > 17) {
	            this.t = this.buf[this.ip++] - 17;
	            if (this.t < 4) {
	                this.match_next();
	                this.ret = this.match();
	                if(this.ret !== this.OK) {
	                    return this.ret === this.EOF_FOUND ? this.OK : this.ret;
	                }
	            } else {
	                this.copy_from_buf();
	                this.skipToFirstLiteralFun = true;
	            }
	        }
	        for (;;) {
	            if(!this.skipToFirstLiteralFun) {
	                this.t = this.buf[this.ip++];
	                if (this.t >= 16) {
	                    this.ret = this.match();
	                    if(this.ret !== this.OK) {
	                        return this.ret === this.EOF_FOUND ? this.OK : this.ret;
	                    }
	                    continue;
	                } else if (this.t === 0) {
	                    while (this.buf[this.ip] === 0) {
	                        this.t += 255;
	                        this.ip++;
	                    }
	                    this.t += 15 + this.buf[this.ip++];
	                }
	                this.t += 3;
	                this.copy_from_buf();
	            } else {
	                this.skipToFirstLiteralFun = false;
	            }
	            this.t = this.buf[this.ip++];
	            if (this.t < 16) {
	                this.m_pos = this.op - (1 + 0x0800);
	                this.m_pos -= this.t >> 2;
	                this.m_pos -= this.buf[this.ip++] << 2;
	                this.minNewSize = this.op + 3;
	                if(this.minNewSize > this.cbl) {this.extendBuffer();}
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.out[this.op++] = this.out[this.m_pos++];
	                this.out[this.op++] = this.out[this.m_pos];
	                if(this.match_done() === 0) {
	                    continue;
	                } else {
	                    this.match_next();
	                }
	            }
	            this.ret = this.match();
	            if(this.ret !== this.OK) {
	                return this.ret === this.EOF_FOUND ? this.OK : this.ret;
	            }
	        }
	    };

	}

	var instance = new _lzo1x();

	return {
		setBlockSize: function(blockSize) {
			return instance.setBlockSize(blockSize);
		},
		setOutputEstimate: function(outputSize) {
			return instance.setOutputSize(outputSize);
		},
		setReturnNewBuffers: function(b) {
			instance.setReturnNewBuffers(b);
		},
		compress: function(state, cfg) {
			if(cfg !== undefined) {
				instance.applyConfig(cfg);
			}
			return instance.compress(state);
		},
		decompress: function(state, cfg) {
			if(cfg !== undefined) {
				instance.applyConfig(cfg);
			}
			return instance.decompress(state);
		}
	};
})();


