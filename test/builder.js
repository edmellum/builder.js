
/**
 * Module dependencies.
 */

var Builder = require('..')
  , assert = require('better-assert')
  , exec = require('child_process').exec
  , path = require('path')
  , resolve = path.resolve
  , fs = require('fs')
  , realpath = fs.realpathSync
  , exists = fs.existsSync
  , read = fs.readFileSync;

describe('Builder', function(){
  describe('.buildScripts(fn)', function(){
    it('should build the scripts', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.buildScripts(function(err, js){
        if (err) return done(err);
        var out = read('test/fixtures/hello-js.js', 'utf8');
        js.should.equal(out);
        done();
      })
    })

    it('should buffer components only once', function(done){
      var builder = new Builder('test/fixtures/boot');
      builder.addLookup('test/fixtures');
      builder.buildScripts(function(err, js){
        if (err) return done(err);
        var out = read('test/fixtures/ignore.js', 'utf8');
        js.should.equal(out);
        done();
      })
    })

    it('should emit "dependency" events', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.buildScripts(function(){});
      builder.on('dependency', function(builder){
        builder.dir.should.be.a('string');
        builder.name.should.equal('component-emitter');
        done();
      });
    })
  })

  describe('.buildStyles(fn)', function(){
    it('should build the styles', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.buildStyles(function(err, css){
        if (err) return done(err);
        var out = read('test/fixtures/hello.css', 'utf8');
        css.should.equal(out);
        done();
      })
    })

    it('should emit "dependency" events', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.buildStyles(function(){});
      builder.on('dependency', function(builder){
        builder.dir.should.be.a('string');
        builder.name.should.equal('component-emitter');
        done();
      });
    })
  })

  describe('.build(fn)', function(){
    beforeEach(function(done){
      exec('rm -fr /tmp/build', done);
    })

    it('should build js', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/hello.js', 'utf8');
        res.js.should.equal(out);
        done();
      })
    })

    it('should build css', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/hello.css', 'utf8');
        res.css.should.equal(out);
        done();
      })
    })

    it('should load the require.js script', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = require('component-require');
        res.require.should.equal(out);
        done();
      })
    })

    it('should symlink .images', function(done){
      var builder = new Builder('test/fixtures/assets');
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.build(function(err, res){
        if (err) return done(err);
        assert(3 == res.images.length);
        assert('/tmp/build/assets/images/logo.png' == res.images[0]);
        assert('/tmp/build/assets/images/maru.jpeg' == res.images[1]);
        assert('/tmp/build/assets/images/npm.png' == res.images[2]);
        assert(exists('/tmp/build/assets/images/maru.jpeg'));
        assert(exists('/tmp/build/assets/images/logo.png'));
        assert(exists('/tmp/build/assets/images/npm.png'));
        done();
      });
    })

    it('should symlink .files', function(done){
      var builder = new Builder('test/fixtures/assets-parent');
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.build(function(err, res){
        if (err) return done(err);
        assert(1 == res.files.length);
        assert('/tmp/build/assets/some.txt' == res.files[0]);
        var real = realpath('/tmp/build/assets/some.txt');
        var path = resolve('test/fixtures/assets/some.txt');
        assert(real == path);
        assert(exists('/tmp/build/assets/some.txt'));
        done();
      });
    })

    it('should rewrite css urls', function(done){
      var builder = new Builder('test/fixtures/assets-parent');
      builder.addLookup('test/fixtures');
      builder.copyAssetsTo('/tmp/build');
      builder.prefixUrls('build');
      builder.build(function(err, res){
        if (err) return done(err);
        res.css.should.include('url("build/assets/images/logo.png")');
        res.css.should.include('url("build/assets/images/maru.jpeg")');
        res.css.should.include('url("build/assets/images/npm.png")');
        res.css.should.include('url("http://example.com/images/manny.png")');
        done();
      });
    })
  })

  it('should build local dependencies', function(done){
    var builder = new Builder('test/fixtures/bundled');
    builder.addLookup('test/fixtures');
    builder.addLookup('test/fixtures/lib/components');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('foo/index.js');
      done();
    })
  })

  it('should error on failed dep lookup', function(done){
    var builder = new Builder('test/fixtures/bundled');
    builder.build(function(err, res){
      err.message.should.equal('failed to lookup "bundled"\'s dependency "foo"');
      done();
    })
  })

  it('should not build development dependencies by default', function(done){
    var builder = new Builder('test/fixtures/dev-deps');
    builder.addLookup('test/fixtures');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('component-emitter/index.js');
      res.js.should.not.include('component-jquery/index.js');
      done();
    })
  })

  describe('.addLookup(path)', function(){
    it('should build dependencies from a default location string', function(done){
      var builder = new Builder('test/fixtures/lookups/deep');
      builder.addLookup('test/fixtures');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/lookups-deep-js.js', 'utf8');
        res.js.should.equal(out);
        done();
      })
    })

    it('should build dependencies from array of locations', function(done){
      var builder = new Builder('test/fixtures/lookups/deep2');
      builder.addLookup(['test/fixtures', 'examples/components']);
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/lookups-deep2-js.js', 'utf8');
        res.js.should.equal(out);
        done();
      })
    })
    
    it('can build scripts for dependencies of dependencies...', function(done){
      var builder = new Builder('test/fixtures/lookups/deep3');
      builder.addLookup(['test/fixtures', 'test/fixtures/lookups', 'examples/components']);
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/lookups-deep3-js.js', 'utf8');
        res.js.should.equal(out);
        done();
      })
    })
  })

  describe('.development()', function(){
    it('should build development dependencies', function(done){
      var builder = new Builder('test/fixtures/dev-deps');
      builder.addLookup('test/fixtures');
      builder.development();
      builder.build(function(err, res){
        if (err) return done(err);
        res.js.should.include('component-emitter/index.js');
        res.js.should.include('component-jquery/index.js');
        done();
      })
    })
  })

  describe('.enableSourceUrls()', function() {
    it('should build in sourceURLs', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.enableSourceUrls();
      builder.buildScripts(function(err, js){
        if (err) return done(err);
        var out = read('test/fixtures/hello-sourceurl-js.js', 'utf8');
        js.should.equal(out);
        done();
      })
    })
  });

  describe('.ignore(name)', function(){
    it('should ignore the given component and its deps', function(done){
      var builder = new Builder('test/fixtures/hello');
      builder.addLookup('test/fixtures');
      builder.ignore('component/emitter');
      builder.build(function(err, res){
        if (err) return done(err);
        var out = read('test/fixtures/hello-ignore.js', 'utf8');
        res.js.should.equal(out);
        done();
      })
    })
  })

  it('should support "main"', function(done){
    var builder = new Builder('test/fixtures/main-boot');
    builder.addLookup('test/fixtures');
    builder.build(function(err, res){
      if (err) return done(err);
      res.js.should.include('require.alias("boot/boot.js", "boot/index.js")');
      res.js.should.include('require.alias("main/foo.js", "boot/deps/main/index.js")');
      done();
    })
  })
})