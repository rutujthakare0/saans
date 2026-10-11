import mongoose from 'mongoose';
const schema = new mongoose.Schema({ schoolId: { type: mongoose.Schema.Types.ObjectId, ref:'School', required:true, index:true }, name:{type:String,required:true,trim:true,maxlength:80}, phone:{type:String,default:'',maxlength:30}, passwordHash:{type:String,required:true}, inviteTokenHash:{type:String,default:null}, inviteExpiresAt:{type:Date,default:null}, inviteUsedAt:{type:Date,default:null} }, { timestamps:true });
export default mongoose.model('Teacher', schema);
