var AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1';

var s3 = new AWS.S3();
var cloudwatch = new AWS.CloudWatch();

var BUCKET = 'bechynsk';
var params = { Bucket: BUCKET, Key: 'instances.txt' };
var instances = new Array();
var cloudWatchData = new Array();

s3.getObject(params, function(err, data) {
    if (err) {
        console.log(err, err.stack);
    } else {
        instances = data.Body.toString().split('\r\n');
        
        for (var i = 0; i < instances.length; i++) {
            var endTime = new Date();
            var startTime = new Date();
            startTime.setHours(endTime.getHours() - 1);
            
            params = {
                StartTime: startTime,
                EndTime: endTime,
                Period: 300,
                Namespace: 'AWS/EC2',
                MetricName: 'CPUUtilization',
                Statistics: ['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'],
                Dimensions: [{ 'Name': 'InstanceId', 'Value': instances[i] }]
            };
            
            cloudwatch.getMetricStatistics(params).on('success', function(response) {
                var instanceid = response.request.params.Dimensions[0].Value;
                var datapoints = '';
                for (var j = 0; j < response.data.Datapoints.length; j++) {
                    var datapoint = response.data.Datapoints[j];
                    datapoints += instanceid + ";" 
                        + datapoint.Timestamp + ";" 
                        + datapoint.SampleCount + ";" 
                        + datapoint.Average + ";" 
                        + datapoint.Sum + ";" 
                        + datapoint.Minimum + ";" 
                        + datapoint.Maximum + ";" 
                        + datapoint.Unit + ";\r\n";
                };
                cloudWatchData.push(datapoints);
                if (cloudWatchData.length == instances.length) {
                    var csv = '';
                    for (var j = 0; j < cloudWatchData.length; j++) {
                        csv += cloudWatchData[j];
                    };
                    var key = new Date().getTime() + ".csv";
                    params = { Bucket: BUCKET, Key: key, Body: csv };
                    s3.putObject(params).send();
                    //console.log(csv);
                }
            }).send();
        }
    }
});