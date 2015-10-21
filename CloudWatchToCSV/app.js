var AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1';

var s3 = new AWS.S3();
var cloudwatch = new AWS.CloudWatch();
var RSVP = require('rsvp');

exports.handler = function (event, context) {
    var BUCKET = 'bechynsk';
    var params = { Bucket: BUCKET, Key: 'instances.txt' };
    
    s3.getObject(params, function (err, data) {
        if (err) {
            console.info(err, err.stack);
            context.fail(err);
        } else {
            console.info('START');

            var instances = data.Body.toString().split('\r\n');
            var promises = [];
            for (var i = 0; i < instances.length; i++) {
                console.info(instances[i]);

                var endTime = new Date();
                var startTime = new Date();
                startTime.setHours(endTime.getHours() - 1);

                var promise = new RSVP.Promise(function (resolve, reject) {
                    cloudwatch.getMetricStatistics({
                        StartTime: startTime,
                        EndTime: endTime,
                        Period: 300,
                        Namespace: 'AWS/EC2',
                        MetricName: 'CPUUtilization',
                        Statistics: [ 'SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum' ],
                        Dimensions: [{ 'Name': 'InstanceId', 'Value': instances[i] }]
                    }).on('success', function (response) {
                        var instanceid = response.request.params.Dimensions[0].Value;
                        console.info(instanceid);

                        var datapoints = '';
                        for (var j = 0; j < response.data.Datapoints.length; j++) {
                            var datapoint = response.data.Datapoints[j];
                            datapoints += [
                                instanceid,
                                datapoint.Timestamp,
                                datapoint.SampleCount,
                                datapoint.Average,
                                datapoint.Sum,
                                datapoint.Minimum,
                                datapoint.Maximum,
                                datapoint.Unit,
                                "\r\n"
                            ];
                        }

                        resolve(datapoints);
                    }).on('error', reject).send();
                });

                promises.push(promise);
            }

            RSVP.all(promises).then(function (datapoints) {
                console.info('Create csv file');
                var csv = datapoints.join();
                var key = new Date().getTime() + ".csv";
                params = { Bucket: BUCKET, Key: key, Body: csv };
                s3.putObject(params, function (err, data) {
                    if (err) {
                        console.info(err, err.stack);
                        context.fail(err);
                    } else {
                        console.info(csv);
                        context.done();
                    }
                });
            }).catch(context.fail);
        }
    });
}
