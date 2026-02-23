import bcrypt from 'bcrypt';
export function genPassword(passwordToEncrypt){
    const hashedPassword = bcrypt.hash(passwordToEncrypt, 10);
    return hashedPassword;
};
export function comparePassword(input, storedPassword){
    const isMatch = bcrypt.compare(input, storedPassword);
    if (!isMatch){
        const err = new Error('Invalid credentials');
        err.status = 401;
        throw err;
    }else{
        return isMatch
    };
}