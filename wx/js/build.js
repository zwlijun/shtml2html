var compressor = require('node-minify');

// Using Google Closure with jQuery 2.0
new compressor.minify({
    type: 'gcc',
    language: 'ECMASCRIPT5',
    fileIn: ['jquery-2.0.3.min.js', 'jquery.bxslider.min.js', 'numberic.js', 'loadmore.js'],
    fileOut: 'all.min.js',
    callback: function(err, min){
        console.log('GCC jquery 2.0');
        console.log(err);
//        console.log(min);
    }
});
