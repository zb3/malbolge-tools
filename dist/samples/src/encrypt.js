var key = 'zb3';
var message = '\rSecret message';
var t, ret = '';
var banner = 'mencrypt v0.2\nLength of the encrypted message: '+message.length+'\nEnter repeated key: ';

for(t=0;t<message.length;t++)
{
 ret += '\\p'+key[t%key.length]+'\\s'+message[t];
}
console.log(banner+ret);