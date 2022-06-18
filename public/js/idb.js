// create var to hold db connection
let db;
// est conection to IDB db and set to vers.1
const request = indexedDB.open('transaction_db', 1);

// this event will emit if the db vers changes (v1 to v2)
request.onupgradeneeded = function (event) {
  // save a ref to the db
  const db = event.target.result;
  // create an object store (table) called `new_transaction`,
  // set it to have an auto-incrementing primary key
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

// when req successful
request.onsuccess = function (event) {
  // when db is successfully created with its object store
  // (from onupgradedneeded event above) or simply est a connection,
  // save ref to db in global var
  db = event.target.result;

  // check if app is online, if yes run uploadTransaction() to send all
  // local db data to api
  if (navigator.onLine) {
    uploadTransaction();
  }
};

request.onerror = function (event) {
  // log err here
  console.log(event.target.errorCode);
};

// this function will be called if users attempt to submit a new data and there's no internet connection
function saveRecord(record) {
  // open a new transaction with the db with read and write permissions
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access the object store for `new_transaction`
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // add record to store with add method
  transactionObjectStore.add(record);
}

function uploadTransaction() {
  // open a transaction on pending db
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access pending object store
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // get all records from store and set to a var
  const getAll = transactionObjectStore.getAll();

  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          const transaction = db.transaction(['new_transaction'], 'readwrite');
          const transactionObjectStore =
            transaction.objectStore('new_transaction');
          // clear all items in your store
          transactionObjectStore.clear();
        })
        .catch(err => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', uploadTransaction);
