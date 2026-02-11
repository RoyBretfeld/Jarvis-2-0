class TestClass {
    constructor() {
        this.name = 'test';
    }
}

console.log('About to export TestClass');
module.exports = { TestClass };
console.log('Exported TestClass');
