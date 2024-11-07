const fs = require('fs');
const axios = require('axios');
var express = require('express');
const csv = require('csv-parser');
const FormData = require('form-data');
const { Solver } = require('@2captcha/captcha-solver');

const app = express();

const solver = new Solver("d01b6c5a017cee99152301914ea2d98e");

function login(email, passwd, token) {
  return new Promise((resolve, reject) => {
    let data = new FormData();

    data.append('email', email);
    data.append('passwd', passwd);
    data.append('g-recaptcha-response', token);
    data.append('udid', 'l9lIBPgKqOxoWp5UWnLha');
    data.append('g-recaptcha-invisible-response', '');
    data.append('device[os][version]', 'x86_64');
    data.append('device[device][vendor]', '');
    data.append('device[device][model]', '');
    data.append('device[os][name]', 'Linux');
    data.append('device[browser]', 'Chrome');
    data.append('device[device][type]', '');

    let config = {
      method: 'post',
      url: 'https://fancentro.com/api/site.twostepauth.secureAuth',
      data: data
    };

    axios.request(config)
      .then((response) => {
        // Access cookies from the response headers
        const cookies = response.headers['set-cookie'];

        const authCookie = cookies.find(cookie => cookie.startsWith('snapcentro_auth='));

        if (authCookie) {
          const authValue = authCookie.split(';')[0].split('=')[1];
          resolve({ status: true, message: 'success', data: response.data, auth: authValue });
        } else {
          resolve({ status: false, message: 'Login failed' });
        }
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function newItem(auth, clientId) {
  return new Promise((resolve, reject) => {
    let data = JSON.stringify({
      "data": {
        "type": "vaultItems",
        "attributes": {}
      },
      "clientId": clientId
    });

    let config = {
      method: 'post',
      url: 'https://fancentro.com/admin/lapi/vaultItems',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Cookie': 'snapcentro_auth=' + auth
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        resolve({ status: true, data: response.data });
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function uploadItem(vaultId, filePath) {
  return new Promise((resolve, reject) => {
    let data = new FormData();

    data.append('file', fs.createReadStream('./public/images/' + filePath));
    data.append('UPLOADCARE_PUB_KEY', '155ca4b503a45996c524');
    data.append('UPLOADCARE_STORE', '0');
    data.append('source', 'local');
    data.append('metadata[vaultId]', vaultId);

    let config = {
      method: 'post',
      url: 'https://upload.uploadcare.com/base/?jsonerrors=1',
      data: data
    };

    axios.request(config)
      .then((response) => {
        resolve({ status: true, data: response.data });
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function createPost(auth, title, vaultId) {
  return new Promise((resolve, reject) => {
    let data = new FormData();

    data.append('title', title);
    data.append('body', '<p>' + title + '</p>');
    data.append('access', '1');
    data.append('resourceVaultItems[' + vaultId + '][position]', '1');
    data.append('resourceVaultItems[' + vaultId + '][isPreview]', '0');

    let config = {
      method: 'post',
      url: 'https://fancentro.com/admin/api/post.create',
      headers: {
        'Cookie': 'snapcentro_auth=' + auth,
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        resolve({ status: true, data: response.data });
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function updatePost(auth, id, publishDate, expirationDate) {
  return new Promise((resolve, reject) => {
    let data = new FormData();

    data.append('id', id);
    data.append('scheduledPublishDate', publishDate);
    data.append('expirationDate', expirationDate);

    let config = {
      method: 'post',
      url: 'https://fancentro.com/admin/api/post.update',
      headers: {
        'Cookie': 'snapcentro_auth=' + auth,
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        resolve({ status: true, data: response.data });
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function attachTag(auth, postId, tag) {
  return new Promise((resolve, reject) => {
    let data = new FormData();

    data.append('postId', postId);
    data.append('tag', tag);

    let config = {
      method: 'post',
      url: 'https://fancentro.com/admin/api/post.attachTag',
      headers: {
        'Cookie': 'snapcentro_auth=' + auth,
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        resolve({ status: true, data: response.data });
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function schedulePost(auth, postId, date) {
  return new Promise((resolve, reject) => {
    let config = {
      method: 'get',
      url: `https://fancentro.com/admin/api/post.scheduledPublish?id=${postId}&date=${date}`,
      headers: {
        'Cookie': 'snapcentro_auth=' + auth
      }
    };

    axios.request(config)
      .then((response) => {
        resolve({ status: true, data: response.data });
      })
      .catch((error) => {
        resolve({ status: false, message: error });
      });
  })
}

function readCSVList(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream('./public/csv/' + filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  })
}

// Default Route
app.get('/', (req, res) => {
  res.status(200).send('Fancentro Bot');
})

app.get('/post', async (req, res) => {
  try {
    // Get reCAPTCHA token
    const result = await solver.recaptcha({
      pageurl: 'https://fancentro.com/login',
      googlekey: '6LeQ8NoaAAAAAPJUZuO7kQVadg5Du420nyZFadke'
    });

    // Login
    const loginData = await login('yasoxid850@gmail.com', 'PpdA!yasoxid850@fnc', result.data);

    const collection = loginData.data.response.member.collection;

    const clientId = Object.keys(collection)[0];

    readCSVList('list.csv').then((data) => {
      data.map(async (item) => {
        // Create new item
        const newData = await newItem(loginData.auth, clientId);

        // Upload item file
        await uploadItem(newData.data.data.id, item.Image);

        const publishDate = Math.round(+new Date(item.StartDate) / 1000);
        const expirationDate = Math.round(+new Date(item.EndDate) / 1000);

        // Create Post
        const postData = await createPost(loginData.auth, item.Title, newData.data.data.id);

        await updatePost(loginData.auth, postData.data.response.id, publishDate, expirationDate);

        const tags = item.Tags.split(' ');

        for (let i = 0; i < tags.length; i++) {
          await attachTag(loginData.auth, postData.data.response.id, tags[i].replace('#', ''));
        }

        await schedulePost(loginData.auth, postData.data.response.id, publishDate);

        return res.send('Post Created!');
      })
    });
  } catch (error) {
    return res.json({ status: false, message: error });
  }
})

// Start Server
const PORT = 8000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));