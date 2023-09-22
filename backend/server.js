const express = require('express');
// const chats = require('./data/data');
const dotenv= require('dotenv')
const connectDB = require('./config/db');
const userRoutes=require('./routes/userRoutes');
const chatRoutes=require('./routes/chatRoutes');
const messageRoutes=require('./routes/messageRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const path=require('path')
const { Socket } = require('socket.io');
dotenv.config();
connectDB();


const app= express();

app.use(express.json());// to accept json data

// app.get('/',(req,res)=>{
//     res.send("API is Running");
// })

app.use('/api/user',userRoutes);//route mounting---use mei is route ke aage aake lag jata hai requested file ka route
app.use('/api/chat',chatRoutes);
app.use('/api/message',messageRoutes);


//--------------------> deployment <------------------
const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

//--------------------> deployment <------------------



app.use(notFound)
app.use(errorHandler)


const Port=process.env.PORT||5000;

const server=app.listen(Port,console.log(`Server Started at ${Port}`));

const io=require('socket.io')(server,{
    pingTimeout:120000,
    cors:{
        origin:"http://localhost:3000"
    }
})

io.on("connection",(socket)=>{
    // console.log('connected to socketio');

    socket.on('setup',(userData)=>{
        socket.join(userData._id);
        console.log(userData._id);
        socket.emit('connected');
    })

    socket.on('join chat',(room)=>{
        socket.join(room);
        console.log("user joined "+room);
    })

    socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on('new message',(newMessageReceived)=>{
        var chat=newMessageReceived.chat;

        if(!chat.users) return console.log('chat.users not defined');

        chat.users.forEach(user=>{
            if(user._id==newMessageReceived.sender._id) return;

            socket.in(user._id).emit("message received",newMessageReceived);
        })
    })

    socket.off("setup",()=>{
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
    });
});
