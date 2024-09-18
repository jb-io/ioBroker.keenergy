![Logo](../admin/keenergy.png)
# Developer manual
This section is intended for the developer. It can be deleted later

## Getting started

You are almost done, only a few steps left:
1. Create a new repository on GitHub with the name `ioBroker.keenergy`
1. Initialize the current folder as a new git repository:  
    ```bash
    git init -b master
    git add .
    git commit -m "Initial commit"
    ```
1. Link your local repository with the one on GitHub:  
    ```bash
    git remote add origin https://github.com/jb-io/ioBroker.keenergy
    ```

1. Push all files to the GitHub repo:  
    ```bash
    git push origin master
    ```
1. Add a new secret under https://github.com/jb-io/ioBroker.keenergy/settings/secrets. It must be named `AUTO_MERGE_TOKEN` and contain a personal access token with push access to the repository, e.g. yours. You can create a new token under https://github.com/settings/tokens.

1. Head over to [main.js](main.js) and start programming!

## Best Practices
We've collected some [best practices](https://github.com/ioBroker/ioBroker.repositories#development-and-coding-best-practices) regarding ioBroker development and coding in general. If you're new to ioBroker or Node.js, you should
check them out. If you're already experienced, you should also take a look at them - you might learn something new :)

## Scripts in `package.json`
Several npm scripts are predefined for your convenience. You can run them using `npm run <scriptname>`
| Script name        | Description                                                                                                                                                              |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `test:js`          | Executes the tests you defined in `*.test.js` files.                                                                                                                     |
| `test:package`     | Ensures your `package.json` and `io-package.json` are valid.                                                                                                             |
| `test:integration` | Tests the adapter startup with an actual instance of ioBroker.                                                                                                           |
| `test`             | Performs a minimal test run on package files and your tests.                                                                                                             |
| `check`            | Performs a type-check on your code (without compiling anything).                                                                                                         |
| `lint`             | Runs `ESLint` to check your code for formatting errors and potential bugs.                                                                                               |
| `translate`        | Translates texts in your adapter to all required languages, see [`@iobroker/adapter-dev`](https://github.com/ioBroker/adapter-dev#manage-translations) for more details. |

## Writing tests
When done right, testing code is invaluable, because it gives you the 
confidence to change your code while knowing exactly if and when 
something breaks. A good read on the topic of test-driven development 
is https://hackernoon.com/introduction-to-test-driven-development-tdd-61a13bc92d92. 
Although writing tests before the code might seem strange at first, but it has very 
clear upsides.

The template provides you with basic tests for the adapter startup and package files.
It is recommended that you add your own tests into the mix.

## Publishing the adapter
Using GitHub Actions, you can enable automatic releases on npm whenever you push a new git tag that matches the form 
`v<major>.<minor>.<patch>`. We **strongly recommend** that you do. The necessary steps are described in `.github/workflows/test-and-release.yml`.

To get your adapter released in ioBroker, please refer to the documentation 
of [ioBroker.repositories](https://github.com/ioBroker/ioBroker.repositories#requirements-for-adapter-to-get-added-to-the-latest-repository).

## Test the adapter manually with dev-server
Since you set up `dev-server`, you can use it to run, test and debug your adapter.

You may start `dev-server` by calling from your dev directory:
```bash
dev-server watch
```

The ioBroker.admin interface will then be available at http://localhost:8081/

Please refer to the [`dev-server` documentation](https://github.com/ioBroker/dev-server#command-line) for more details.
