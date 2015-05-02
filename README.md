# malbolge-tools

This is a set of Malbolge code generators (for a given text) and a web-based GUI for the interactive interpreter and these generators, made using the [malbolge-vm](http://github.com/zb3/malbolge-vm) library.

You can access the GUI [here](http://zb3.github.io/)

It also contains examples of code such as:
* crackme
* theoretical "encryption" (albeit take this with a grain of salt)
* loops
* enter detection code.  

Many of these sample programs were developed using the [LMAO](http://www.matthias-ernst.eu/malbolgeassembler.html) assembler (which is awesome and GPL btw), and source code (assembly) for these examples is provided.

## Three code generators
There are basically 3 different types of code generators for Malbolge:
* **Linear**  
  Generates code per character, code that does not access memory placed after the code. This way, we can generate long text quickly, but the code is long.  
  **Note** since prefix is often randomized, generation speed is randomized as well, so try again if you're stuck.
* **Branch-on-read**  
This creates a branch everytime a new memory location is read,  therefore it recursively checks every possible combination efficiently. The code is short, the generator works in exponential time, but it still doesn't generate the shortest possible code. Why? Because in Malbolge, we can access so-called "default memory" - memory filled after the program which depends on the last two chars of the code. This generator can not make use of this fact.
* **Fixed length**  
This is very similar to BOR generator, but this time we have to specify the length of the program in advance. This enables us to make use of the default memory - we try all 64 possible suffixes for the program so that we know what the default memory will be. This is guaranteed to produce the shortest code if it exists, but it's very slow
 
## Development
The GUI version placed in `dist` directory works out of the box.
If you wish to modify this or use CLI version, install dependencies first:
```
npm install
```

Then in order to build the GUI version:
```
npm run build
```

CLI generators can be accessed like this:
```
node cli/gen-fixed.js
node cli/gen-bor.js
node cli/gen-linear.js
```


## Note on examples

There are two interesting examples included:

### Crackme
Can you crack the code just by analysing the source? It basically checks the character you type and then fires one of two branches depending on the input. The question is - can this be easily cracked (I think so), so that you can see both the key and the resulting message? Of course brute force doesn't count here.

### Encryption
Is this stronger than rot13 or plaintext? If so, is it because less people know about this or because it's harder to crack?  
It currently works like this:  
- `samples/src/encrypt.js` generates the target output for the BOR code generator
- This target output contains prompts, and assumes user enters the key  which is repeated. User has to enter the full key of given length, so the program has to display it.
- Then program assumes user enters the key, and displays the message. The program does **not** guarantee the message depends on the key, but since we're using BOR generator, this will often occur and can be easily checked.
- Since BOR is meant to generate short code, we will often avoid repetitions - IOW, frequency analysis should not be a problem here.

Of course generating these is very slow and the user has to repeat the key which makes it completely impractical. But the question still remains - how hard would it be to crack?

Obviously if we know the plaintext, we can crack the key very easily.
