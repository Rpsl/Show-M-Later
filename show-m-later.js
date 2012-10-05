/**
 * Set unread
 * @type {Boolean}
 */
var MARK_UNREAD     = true;

/**
 * Set stared
 * @type {Boolean}
 */
var MARK_STARRED    = false;

/**
 * Send log email to this email.
 * False for disable.
 * @type {String}
 */
var SEND_LOG        = false;


/**
 * Labels block.
 * Depends on : var labels_int
 * @type {Array}
 */
// var labels   = ["Later", "Guys", "Please", "Write", "Translation"];
var labels      = ["Отложить", "Отложить/Нa 6 часов", "Отложить/На 1 день", "Отложить/На 2 дня"];

/**
 * Day factor: 0.25*1 = 6 hours, 1*1 = 1 day.
 * Depends on : var labels
 * @type {Array}
 */
var labels_int  = [0, 0.25, 1, 2];


/**
 * Run it for install labels
 */
function setup()
{
    for (i = 0; i < labels.length; i++)
    {
        GmailApp.createLabel(labels[i]);
    }
}

// Don't modify
var messages    = {};
var db          = ScriptDb.getMyDb();
var counter     = 0;

function run()
{
    var i;

    // каунтер в нашем случае, это примитивные часы. начинается с 1, плюсуется до 24
    // потом обнуляется.
    // @todo проверить, что у нас действительно 24 часа, а не 23 или 25
    counter = getData('counter', false);

    if ( counter == false )
    {
        setData('counter', 1);
        counter = 1;
    }

    // проходим по нашим лейблам и добавляем письма в стек
    for (i = 0; i < labels.length; i++)
    {
        var label   = GmailApp.getUserLabelByName(labels[i]);
        var mess    = label.getThreads();

        if (mess.length > 0)
        {
            Logger.log('%s %s %s', i, mess.length, counter );
            moveMessages(i, mess);
        }
    }

    if( SEND_LOG )
    {
        MailApp.sendEmail( SEND_LOG, "Script Log", Logger.getLog());
    }

    counter++;

    if (counter > 24)
    {
        counter = 0;
    }

    setData('counter', counter);
}

function moveMessages(label_int, mess)
{
    messages = {};
    var i;
    for (i = 0; i < mess.length; i++)
    {

        var key = mess[i].getId();
        var check = getData(key);

        if ( check === false )
        {
            Logger.log('check undefined');
            setData(key, labels_int[label_int]*24);
            check = labels_int[label_int]*24;
        }
        messages[key] = check-1;
        delete check, key;
    }
    Logger.log( messages );

    for( var k in messages )
    {

        var inbox = false;

        Logger.log(labels[label_int]);

        if( labels[label_int-1] === undefined || messages[k] <= 0 )
        {
            Logger.log('inbox');

            var temp_msg = GmailApp.getThreadById( k );
            var oldLabel = GmailApp.getUserLabelByName( labels[ label_int ] );
            temp_msg.moveToInbox();

            if( MARK_UNREAD ) {
                GmailApp.markThreadUnread(temp_msg);
            }

            if( MARK_STARRED ) {
                GmailApp.starMessage( temp_msg );
            }


            oldLabel.removeFromThread(temp_msg);
            removeData(k);
            inbox = true;

        }
        else if( messages[k] <= ( labels_int[label_int-1]*24 ) )
        {
            var temp_msg = GmailApp.getThreadById( k );

            GmailApp.getUserLabelByName( labels[ label_int ] ).removeFromThread(temp_msg);
            GmailApp.getUserLabelByName( labels[ label_int-1 ] ).addToThread(temp_msg);


            Logger.log( 'msg: %s, %s', temp_msg.getId(), temp_msg.getFirstMessageSubject() );
            Logger.log( 'count: %s, move_count: %s (%s)', messages[k], ( labels_int[label_int-1]*24 ), labels[label_int] );
            Logger.log( 'need move to - %s', labels[ label_int-1 ] );
        }

        if( !inbox )
        {
            setData(k, messages[k]);
        }
    }
}


/**
 * Get data from Db.
 *
 * @param {String} key
 * @param {Boolean} raw - return raw object or key value?
 * @return {*}
 */
function getData( key, raw )
{
    raw = raw || false;

    result = db.query({ key: key });

    while (result.hasNext()) {
        var ob = result.next();

        if( raw ) { return ob; } else { return ob.value; }
    }

    return false;
}

/**
 * Add data to Db
 *
 * @param {String} key
 * @param {String} value
 */
function setData( key, value )
{
    removeData( key );
    var object = { key: key, value: value };
    db.save( object )
}

/**
 * Remove data from Db
 * @param {String} key
 */
function removeData( key )
{
    var obj = getData( key, true );

    if( obj !== false )
    {
        db.remove(obj);
    }
}




